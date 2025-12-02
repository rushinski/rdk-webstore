// src/proxy/rate-limit.ts
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { NextResponse, type NextRequest } from "next/server";

import { log } from "@/lib/log";
import { env } from "@/config/env";

// Upstash Rate Limiter: 30 req/min per IP
const redis = new Redis({
  url: env.UPSTASH_REDIS_REST_URL!,
  token: env.UPSTASH_REDIS_REST_TOKEN!,
});

const limiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(30, "1 m"),
});

// Robust IP extraction for Vercel -> Proxy -> Browser
function getClientIp(req: NextRequest) {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

export async function applyRateLimit(request: NextRequest, requestId: string) {
  const ip = getClientIp(request);
  const { pathname } = request.nextUrl;
  const { success } = await limiter.limit(ip);

  if (!success) {
    // Log the hit
    log({
      level: "warn",
      layer: "proxy",
      message: "rate_limit_block",
      requestId: requestId,
      route: pathname,
      status: 429, // Rate limit exceeded
      event: "rate_limit_exceeded",
      ip: ip,
    });

    // Return 429 response
    const res = NextResponse.json(
      {
        error: "Rate limit exceeded",
        requestId,
      },
      { status: 429 },
    );
    return res;
  }
  return null;
}
