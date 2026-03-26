// app/api/readyz/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Redis } from "@upstash/redis";

import { env } from "@/config/env"; // <-- Zod validation happens on import

export async function GET() {
  const start = Date.now();

  try {
    env;

    // Supabase readiness (Service Role Key)
    const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY);

    const { error: dbError } = await supabase.from("products").select("id").limit(1);

    if (dbError) {
      return NextResponse.json(
        {
          ready: false,
          error: "Supabase query failed",
          details: dbError.message,
        },
        { status: 500 },
      );
    }

    // Redis readiness
    const redis = new Redis({
      url: env.UPSTASH_REDIS_REST_URL,
      token: env.UPSTASH_REDIS_REST_TOKEN,
    });

    let pong: string;
    try {
      pong = await redis.ping();
    } catch (redisErr) {
      return NextResponse.json(
        {
          ready: false,
          error: "Redis unreachable",
          details: redisErr instanceof Error ? redisErr.message : "Unknown Redis error",
        },
        { status: 500 },
      );
    }

    if (pong !== "PONG") {
      return NextResponse.json(
        {
          ready: false,
          error: "Upstash returned invalid response",
          returned: pong,
        },
        { status: 500 },
      );
    }

    // Latency evaluation
    const latency = Date.now() - start;

    if (latency > 500) {
      return NextResponse.json(
        {
          ready: true,
          degraded: true,
          message: "Latency above threshold",
          latency_ms: latency,
        },
        { status: 200 },
      );
    }

    // Report success
    return NextResponse.json(
      {
        ready: true,
        latency_ms: latency,
      },
      { status: 200 },
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected error";

    return NextResponse.json(
      {
        ready: false,
        error: "Startup readiness check failed",
        details: message,
      },
      { status: 500 },
    );
  }
}
