// src/proxy/rate-limit.ts
import { NextResponse, type NextRequest } from "next/server";
import { Ratelimit, type Duration } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

import { log } from "@/lib/utils/log";
import { env } from "@/config/env";
import { security } from "@/config/security";

/**
 * Parse duration string like "1m" or "5 s" into an Upstash Duration
 */
function parseDuration(duration: string): Duration {
  const match = duration.trim().match(/^(\d+)\s*(ms|s|m|h|d)$/i);

  if (!match) {
    throw new Error(
      `Invalid duration format: ${duration}. Expected format like "1m", "5 s", "1 h", "250ms"`,
    );
  }

  const value = Number.parseInt(match[1], 10);
  const unit = match[2].toLowerCase() as "ms" | "s" | "m" | "h" | "d";
  return `${value} ${unit}` as Duration;
}

type RateLimitResult = {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
};

let redis: Redis | null = null;

// Cache limiters by (bucketName + limit + window) to avoid recreation
const limiterCache = new Map<string, Ratelimit>();

const hasUpstash = Boolean(env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN);

function getRedis(): Redis {
  if (!hasUpstash) {
    throw new Error("rate_limit_missing_upstash_config");
  }

  if (redis) {
    return redis;
  }

  redis = new Redis({
    url: env.UPSTASH_REDIS_REST_URL!,
    token: env.UPSTASH_REDIS_REST_TOKEN!,
  });

  return redis;
}

function getLimiter(bucket: string, maxRequests: number, window: string): Ratelimit {
  const envLabel = env.NODE_ENV ?? "unknown";
  const cacheKey = `${envLabel}:${bucket}:${maxRequests}:${window}`;

  const cached = limiterCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const instance = new Ratelimit({
    redis: getRedis(),
    limiter: Ratelimit.slidingWindow(maxRequests, parseDuration(window)),
    prefix: `rdk:rl:${envLabel}:${bucket}`,
  });

  limiterCache.set(cacheKey, instance);
  return instance;
}

function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const firstIp = forwardedFor.split(",")[0]?.trim();
    if (firstIp) {
      return firstIp;
    }
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp;
  }

  return "unknown";
}

function maskIpForLog(ip: string): string {
  if (ip === "unknown") {
    return ip;
  }

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

type Policy = { bucket: string; maxRequests: number; window: string };

/**
 * Your requested policy:
 * Auth:
 *  - /api/auth/login: 10 per 5m
 *  - /api/auth/register: 5 per 10m
 *  - /api/auth/forgot-password: 3 per 15m
 * Checkout:
 *  - /api/checkout: 60 per 1m
 * API:
 *  - writes: 30 per 1m
 *  - reads: 300 per 1m
 */
function getPolicyForRequest(pathname: string, method: string): Policy | null {
  if (!pathname.startsWith("/api")) {
    return null;
  }

  // Auth endpoints (exact match or prefix)
  if (pathname.startsWith("/api/auth/login")) {
    return { bucket: "auth_login", maxRequests: 10, window: "5 m" };
  }
  if (pathname.startsWith("/api/auth/register")) {
    return { bucket: "auth_register", maxRequests: 5, window: "10 m" };
  }
  if (pathname.startsWith("/api/auth/forgot-password")) {
    return { bucket: "auth_forgot", maxRequests: 3, window: "15 m" };
  }

  // Checkout
  if (pathname.startsWith("/api/checkout")) {
    return { bucket: "checkout", maxRequests: 60, window: "1 m" };
  }

  // General API read vs write
  const m = method.toUpperCase();
  const isRead = m === "GET" || m === "HEAD";

  if (isRead) {
    return { bucket: "api_read", maxRequests: 300, window: "1 m" };
  }

  // Writes: POST/PUT/PATCH/DELETE (and treat unknown as write)
  return { bucket: "api_write", maxRequests: 30, window: "1 m" };
}

export async function applyRateLimit(
  request: NextRequest,
  requestId: string,
): Promise<NextResponse | null> {
  const { pathname, hostname } = request.nextUrl;
  const { rateLimit } = security.proxy;

  if (!rateLimit.enabled) {
    return null;
  }

  // Never rate-limit the too-many page (mostly irrelevant now)
  if (pathname === rateLimit.tooManyRequestsPath) {
    return null;
  }

  // Local dev behavior
  const isLocalhost =
    hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
  if (!rateLimit.applyInLocalDev && isLocalhost) {
    return null;
  }

  const policy = getPolicyForRequest(pathname, request.method);
  if (!policy) {
    return null;
  }

  const clientIp = getClientIp(request);
  if (!clientIp || clientIp === "unknown") {
    // Fail open (your current behavior)
    log({
      level: "warn",
      layer: "proxy",
      message: "rate_limit_missing_ip_fail_open",
      requestId,
      route: pathname,
      method: request.method,
      event: "rate_limit_missing_ip",
      ip: "unknown",
    });
    return null;
  }

  try {
    const limiter = getLimiter(policy.bucket, policy.maxRequests, policy.window);

    // One key, one bucket
    const key = `host:${hostname}:ip:${clientIp}:bucket:${policy.bucket}`;
    const result = (await limiter.limit(key)) as RateLimitResult;

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
      bucket: policy.bucket,
      ip: maskIpForLog(clientIp),
      limit: result.limit,
      remaining: result.remaining,
      reset: result.reset,
    });

    // For APIs, respond JSON (since we now only limit /api anyway)
    const response = NextResponse.json(
      {
        error: "Rate limit exceeded",
        requestId,
        bucket: policy.bucket,
        limit: result.limit,
        remaining: result.remaining,
        reset: result.reset,
      },
      { status: rateLimit.blockStatus },
    );

    response.headers.set("X-RateLimit-Bucket", policy.bucket);
    response.headers.set("X-RateLimit-Limit", String(result.limit));
    response.headers.set("X-RateLimit-Remaining", String(result.remaining));
    response.headers.set("X-RateLimit-Reset", String(result.reset));
    response.headers.set("Cache-Control", "no-store");

    return response;
  } catch (err) {
    // Fail open on Upstash errors
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
}
