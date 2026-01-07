// src/proxy/rate-limit.ts
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { NextResponse, type NextRequest } from "next/server";

import { log } from "@/lib/log";
import { env } from "@/config/env";
import { security } from "@/config/security";

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
  const forwardedFor = request.headers.get("x-forwarded-for");

  if (forwardedFor) {
    const firstIp = forwardedFor.split(",")[0]?.trim();
    if (firstIp) return firstIp;
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp;

  return "unknown";
}

function maskIpForLog(ip: string): string {
  if (ip === "unknown") return ip;

  if (ip.includes(".")) {
    const parts = ip.split(".");
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.${parts[2]}.xxx`;
    }
    return ip; 
  }

  if (ip.includes(":")) {
    const parts = ip.split(":").filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0]}:${parts[1]}::/??`;
    }
    return ip; 
  }

  return ip;
}

export async function applyRateLimit(
  request: NextRequest,
  requestId: string
): Promise<NextResponse | null> {
  const { pathname } = request.nextUrl;
  const clientIp = getClientIp(request);
  const { rateLimit } = security.proxy;

  if (pathname === rateLimit.tooManyRequestsPath) {
    return null;
  }
  if (rateLimit.bypassPrefixes?.some((prefix) => pathname.startsWith(prefix))) {
    return null;
  }
  let result: Awaited<ReturnType<typeof rateLimiter.limit>>;

  try {
    result = await rateLimiter.limit(clientIp);
  } catch (err) {
    log({
      level: "error",
      layer: "proxy",
      message: "rate_limit_unavailable_fail_open",
      requestId,
      route: pathname,
      method: request.method,
      event: "rate_limit_outage",
      ip: maskIpForLog(clientIp),
      error: err instanceof Error ? err.message : String(err),
    });
    return null; 
  }

  if (result.success) {
    return null;
  }

  log({
    level: "warn",
    layer: "proxy",
    message: "rate_limit_block",
    requestId,
    route: pathname,
    method: request.method,
    status: rateLimit.blockStatus,
    event: "rate_limit_exceeded",
    ip: maskIpForLog(clientIp),

    limit: result.limit,
    remaining: result.remaining,
    reset: result.reset,
  });

  const acceptHeader = request.headers.get("accept") ?? "";
  const isBrowserNavigation =
    acceptHeader.includes("text/html") && !pathname.startsWith("/api");

  if (isBrowserNavigation) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = rateLimit.tooManyRequestsPath;
    
    redirectUrl.searchParams.set("from", pathname);

    return NextResponse.redirect(redirectUrl, rateLimit.redirectStatus);
  }

  const response = NextResponse.json(
    { error: "Rate limit exceeded", requestId },
    { status: rateLimit.blockStatus }
  );

  response.headers.set("X-RateLimit-Limit", String(result.limit));
  response.headers.set("X-RateLimit-Remaining", String(result.remaining));
  response.headers.set("X-RateLimit-Reset", String(result.reset));
  response.headers.set("Cache-Control", "no-store");

  return response;
}
