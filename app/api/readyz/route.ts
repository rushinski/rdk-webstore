import Stripe from "stripe";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Redis } from "@upstash/redis";

import { env } from "@/config/env";

export async function GET() {
  const start = Date.now();

  try {
    const stripe = new Stripe(env.STRIPE_SECRET_KEY);

    const supabase = createClient(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.SUPABASE_SERVICE_ROLE_KEY,
    );

    const redis = new Redis({
      url: env.UPSTASH_REDIS_REST_URL,
      token: env.UPSTASH_REDIS_REST_TOKEN,
    });

    const { error: dbError } = await supabase.from("products").select("id").limit(1);

    if (dbError) {
      return NextResponse.json(
        { ready: false, error: "Supabase query failed", details: dbError.message },
        { status: 500 },
      );
    }

    const pong = await redis.ping(); // If PONG is returned Redis is working 

    if (pong !== "PONG") {
      return NextResponse.json(
        { ready: false, error: "Upstash returned invalid response" },
        { status: 500 },
      );
    }

    const latency = Date.now() - start;

    if (latency > 500) {
      return NextResponse.json(
        { ready: true, message: "Upstash latency degraded", latency_ms: latency },
        { status: 200 },
      );
    }

    return NextResponse.json({ ready: true, latency_ms: latency }, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    return NextResponse.json({ ready: false, error: message }, { status: 500 });
  }
}
