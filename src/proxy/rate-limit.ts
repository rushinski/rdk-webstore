// src/proxy/rate-limit.ts
import { NextResponse, type NextRequest } from "next/server";

import { log } from "@/lib/log";
import { env } from "@/config/env";
import { security } from "@/config/security";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

type RateLimitResult = {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
};

const parseWindowMs = (window: string): number => {
  const match = window.trim().match(/^(\d+)\s*([smhd])$/i);
  if (!match) return 60_000;
  const value = Number.parseInt(match[1] ?? "0", 10);
  const unit = match[2]?.toLowerCase();
  const multiplier = unit === "s" ? 1_000 : unit === "m" ? 60_000 : unit === "h" ? 3_600_000 : 86_400_000;
  return value * multiplier;
};

const windowMs = parseWindowMs(security.proxy.rateLimit.window);
const memoryStore = new Map<string, number[]>();

const memoryLimiter = {
  limit: async (key: string): Promise<RateLimitResult> => {
    const now = Date.now();
    const windowStart = now - windowMs;
    const existing = memoryStore.get(key) ?? [];
    const recent = existing.filter((timestamp) => timestamp > windowStart);
    recent.push(now);
    memoryStore.set(key, recent);

    const limit = security.proxy.rateLimit.maxRequests;
    const remaining = Math.max(0, limit - recent.length);
    const reset =
      recent.length > 0
        ? Math.ceil((recent[0] + windowMs) / 1000)
        : Math.ceil((now + windowMs) / 1000);

    return {
      success: recent.length <= limit,
      limit,
      remaining,
      reset,
    };
  },
};

let upstashLimiter: Ratelimit | null = null;

const hasUpstash = Boolean(env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN);

const getUpstashLimiter = () => {
  if (upstashLimiter) return upstashLimiter;
  if (!hasUpstash) {
    throw new Error("rate_limit_missing_upstash_config");
  }
  const redis = new Redis({
    url: env.UPSTASH_REDIS_REST_URL!,
    token: env.UPSTASH_REDIS_REST_TOKEN!,
  });

  upstashLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(
      security.proxy.rateLimit.maxRequests,
      security.proxy.rateLimit.window
    ),
  });

  return upstashLimiter;
};

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
  let result: RateLimitResult;

  try {
    if (security.proxy.rateLimit.store === "memory" || !hasUpstash) {
      result = await memoryLimiter.limit(clientIp);
    } else {
      result = await getUpstashLimiter().limit(clientIp);
    }
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
