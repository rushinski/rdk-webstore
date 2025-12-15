// src/proxy/rate-limit.ts
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { NextResponse, type NextRequest } from "next/server";

import { log } from "@/lib/log";
import { env } from "@/config/env";

// Upstash Rate Limiter
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

  // Don't rate-limit the rate-limit page itself
  if (pathname === "/too-many-requests") {
    return null;
  }

  const { success } = await limiter.limit(ip);

  if (!success) {
    // Log the hit
    log({
      level: "warn",
      layer: "proxy",
      message: "rate_limit_block",
      requestId: requestId,
      userId: null,
      route: pathname,
      method: null,
      status: 429,
      latency_ms: null,
      stripeSessionId: null,
      event: "rate_limit_exceeded",
      ip: ip,
    });

    const acceptHeader = request.headers.get("accept") || "";
    const isPageRequest =
      acceptHeader.includes("text/html") && !pathname.startsWith("/api");

    if (isPageRequest) {
      // Redirect browser page requests to friendly rate-limit page
      const url = request.nextUrl.clone();
      url.pathname = "/too-many-requests";
      url.searchParams.set("from", pathname); // remember where they came from
      return NextResponse.redirect(url);
    }

    // For APIs / non-HTML clients, keep JSON 429
    return NextResponse.json(
      {
        error: "Rate limit exceeded",
        requestId,
      },
      { status: 429 },
    );
  }

  // Not rate-limited, carry on
  return null;
}
