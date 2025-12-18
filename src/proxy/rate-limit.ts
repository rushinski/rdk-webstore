// src/proxy/rate-limit.ts
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { NextResponse, type NextRequest } from "next/server";

import { log } from "@/lib/log";
import { env } from "@/config/env";
import { security } from "@/config/security";

// Upstash Redis client (Edge-safe). Assumes env validation is handled in "@/config/env".
const redis = new Redis({
  url: env.UPSTASH_REDIS_REST_URL!,
  token: env.UPSTASH_REDIS_REST_TOKEN!,
});

const rateLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(
    security.proxy.rateLimit.maxRequests,
    security.proxy.rateLimit.window
  ),
});

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

function maskIpForLog(ip: string): string {
  if (ip === "unknown") return ip;

  if (ip.includes(".")) {
    const parts = ip.split(".");
    if (parts.length === 4) return `${parts[0]}.${parts[1]}.${parts[2]}.xxx`;
    return ip;
  }

  if (ip.includes(":")) {
    const parts = ip.split(":").filter(Boolean);
    if (parts.length >= 2) return `${parts[0]}:${parts[1]}::/??`;
    return ip;
  }

  return ip;
}

export async function applyRateLimit(
  request: NextRequest,
  requestId: string
): Promise<NextResponse | null> {
  const { pathname } = request.nextUrl;
  const ip = getClientIp(request);

  const { rateLimit } = security.proxy;

  // Avoid redirect loops: never rate-limit the friendly "too many requests" page.
  if (pathname === rateLimit.tooManyRequestsPath) return null;

  // Use IP as the primary key. (If you later want per-route buckets, we can add it here.)
  const result = await rateLimiter.limit(ip);

  if (result.success) return null;

  // Centralized blocker to keep response + logging consistent.
  const block = () => {
    log({
      level: "warn",
      layer: "proxy",
      message: "rate_limit_block",
      requestId,
      route: pathname,
      method: request.method,
      status: rateLimit.blockStatus,
      event: "rate_limit_exceeded",
      ip: maskIpForLog(ip),

      // Helpful Upstash metadata for debugging (non-sensitive)
      limit: result.limit,
      remaining: result.remaining,
      reset: result.reset,
    });

    const accept = request.headers.get("accept") ?? "";
    const isHtmlNavigation = accept.includes("text/html") && !pathname.startsWith("/api");

    if (isHtmlNavigation) {
      // Redirect browser page requests to a friendly page.
      const url = request.nextUrl.clone();
      url.pathname = rateLimit.tooManyRequestsPath;
      url.searchParams.set("from", pathname);

      return NextResponse.redirect(url, rateLimit.redirectStatus);
    }

    // For APIs / non-HTML clients, keep JSON 429.
    const res = NextResponse.json(
      { error: "Rate limit exceeded", requestId },
      { status: rateLimit.blockStatus }
    );

    // Optional: expose standard-ish rate limit metadata for clients.
    // (Safe because it’s not secret, but still useful.)
    res.headers.set("X-RateLimit-Limit", String(result.limit));
    res.headers.set("X-RateLimit-Remaining", String(result.remaining));
    res.headers.set("X-RateLimit-Reset", String(result.reset));

    // Avoid caching rate-limit responses.
    res.headers.set("Cache-Control", "no-store");

    return res;
  };

  return block();
}
