// src/proxy/rate-limit.ts
import { NextResponse, type NextRequest } from "next/server";
import { Ratelimit, type Duration } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

import { log } from "@/lib/log";
import { env } from "@/config/env";
import { security, getRateLimitConfigForPath } from "@/config/security";

/**
 * Parse duration string like "1m" or "5 s" into an Upstash Duration
 * (Upstash expects a human-readable Duration string, not milliseconds)
 */
function parseDuration(duration: string): Duration {
  const match = duration.trim().match(/^(\d+)\s*(ms|s|m|h|d)$/i);

  if (!match) {
    throw new Error(
      `Invalid duration format: ${duration}. Expected format like "1m", "5 s", "1 h", "250ms"`
    );
  }

  const value = Number.parseInt(match[1], 10);
  const unit = match[2].toLowerCase() as "ms" | "s" | "m" | "h" | "d";

  // Normalize to a canonical form: "10 s"
  return `${value} ${unit}` as Duration;
}

type RateLimitResult = {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
};

type WhichBucket = "global" | "path";

let redis: Redis | null = null;
let globalLimiter: Ratelimit | null = null;

// Cache for path-specific limiters to avoid recreating them
const pathLimiters = new Map<string, Ratelimit>();

const hasUpstash = Boolean(env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN);

function getRedis(): Redis {
  if (!hasUpstash) {
    throw new Error("rate_limit_missing_upstash_config");
  }

  if (redis) return redis;

  redis = new Redis({
    url: env.UPSTASH_REDIS_REST_URL!,
    token: env.UPSTASH_REDIS_REST_TOKEN!,
  });

  return redis;
}

function getGlobalLimiter(): Ratelimit {
  if (globalLimiter) return globalLimiter;

  const redisInstance = getRedis();
  const rateLimit = security.proxy.rateLimit;
  const envLabel = process.env.NODE_ENV ?? "unknown";

  globalLimiter = new Ratelimit({
    redis: redisInstance,
    limiter: Ratelimit.slidingWindow(rateLimit.maxRequestsGlobal, parseDuration(rateLimit.window)),
    prefix: `rdk:rl:global:${envLabel}`,
  });

  return globalLimiter;
}

function getPathLimiter(pathname: string, maxRequests: number, window: string): Ratelimit {
  const envLabel = process.env.NODE_ENV ?? "unknown";
  const cacheKey = `${pathname}:${maxRequests}:${window}`;
  
  if (pathLimiters.has(cacheKey)) {
    return pathLimiters.get(cacheKey)!;
  }

  const redisInstance = getRedis();
  
  const limiter = new Ratelimit({
    redis: redisInstance,
    limiter: Ratelimit.slidingWindow(maxRequests, parseDuration(window)),
    prefix: `rdk:rl:path:${envLabel}`,
  });

  pathLimiters.set(cacheKey, limiter);
  return limiter;
}

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

/**
 * Normalize pathname for rate limiting by removing query parameters
 * for routes that have dynamic filters.
 */
function normalizePathForRateLimit(pathname: string): string {
  // Routes that should have query params stripped for rate limiting
  const FILTERED_ROUTES = [
    '/store',
    '/brands',
    '/search',
  ];

  const isFilteredRoute = FILTERED_ROUTES.some(route => 
    pathname === route || pathname.startsWith(`${route}/`)
  );

  return isFilteredRoute ? pathname.split('?')[0] : pathname;
}

/**
 * Detect Next.js prefetch and App Router flight requests
 */
function getPrefetchSignals(request: NextRequest): string[] {
  const signals: string[] = [];
  const h = (name: string) => request.headers.get(name);
  const url = request.nextUrl;
  const rawUrl = request.url;

  // App Router flight query param
  if (url.searchParams.has("_rsc")) signals.push("q:_rsc(nextUrl)");
  if (rawUrl.includes("_rsc=")) signals.push("q:_rsc(rawUrl)");

  // Next.js App Router flight headers
  const rsc = (h("rsc") ?? "").toLowerCase();
  if (rsc === "1" || rsc === "true") signals.push("hdr:rsc");

  if (h("next-router-prefetch") === "1") signals.push("hdr:next-router-prefetch=1");
  if (h("next-router-segment-prefetch")) signals.push("hdr:next-router-segment-prefetch");
  if (h("x-middleware-prefetch") === "1") signals.push("hdr:x-middleware-prefetch=1");

  // Flight payload content-type
  const accept = (h("accept") ?? "").toLowerCase();
  if (accept.includes("text/x-component")) signals.push("hdr:accept=text/x-component");

  // Browser prefetch
  const purpose = (
    h("purpose") ??
    h("sec-purpose") ??
    h("sec-fetch-purpose") ??
    ""
  ).toLowerCase();
  if (purpose.includes("prefetch")) signals.push("hdr:purpose=prefetch");

  if (h("next-router-state-tree")) signals.push("hdr:next-router-state-tree");

  return signals;
}

function isPrefetchLike(request: NextRequest): { yes: boolean; signals: string[] } {
  const signals = getPrefetchSignals(request);
  return { yes: signals.length > 0, signals };
}

function pickMostRestrictive(
  globalResult: RateLimitResult,
  pathResult: RateLimitResult
): { which: WhichBucket; result: RateLimitResult } {
  if (!globalResult.success && pathResult.success) return { which: "global", result: globalResult };
  if (!pathResult.success && globalResult.success) return { which: "path", result: pathResult };

  if (!globalResult.success && !pathResult.success) {
    return globalResult.remaining <= pathResult.remaining
      ? { which: "global", result: globalResult }
      : { which: "path", result: pathResult };
  }

  return globalResult.remaining <= pathResult.remaining
    ? { which: "global", result: globalResult }
    : { which: "path", result: pathResult };
}

export async function applyRateLimit(
  request: NextRequest,
  requestId: string
): Promise<NextResponse | null> {
  const { pathname, hostname } = request.nextUrl;
  const { rateLimit } = security.proxy;

  // Config master kill switch
  if (!rateLimit.enabled) return null;

  // Never rate-limit the rate-limit page itself
  if (pathname === rateLimit.tooManyRequestsPath) return null;

  // Allowlist bypasses
  if (rateLimit.bypassPrefixes?.some((prefix) => pathname.startsWith(prefix))) return null;

  // Local dev behavior
  const isLocalhost =
    hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
  const isLocalDev = isLocalhost;

  if (!rateLimit.applyInLocalDev && isLocalDev) return null;

  // Ignore prefetch/RSC requests
  if (rateLimit.ignorePrefetch) {
    const prefetch = isPrefetchLike(request);
    if (prefetch.yes) {
      return null;
    }
  }

  const clientIp = getClientIp(request);

  if (!clientIp || clientIp === "unknown") {
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

  // Get the appropriate rate limit config for this path
  const normalizedPath = normalizePathForRateLimit(pathname);
  const pathConfig = getRateLimitConfigForPath(normalizedPath);

  let globalResult: RateLimitResult;
  let pathResult: RateLimitResult;

  try {
    const globalLimiter = getGlobalLimiter();
    const pathLimiter = getPathLimiter(
      normalizedPath,
      pathConfig.maxRequests,
      pathConfig.window
    );

    const globalKey = `host:${hostname}:ip:${clientIp}`;
    const perPathKey = `host:${hostname}:ip:${clientIp}:path:${normalizedPath}`;

    const [g, p] = await Promise.all([
      globalLimiter.limit(globalKey),
      pathLimiter.limit(perPathKey),
    ]);

    globalResult = g as RateLimitResult;
    pathResult = p as RateLimitResult;
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

  const blocked = !globalResult.success || !pathResult.success;
  if (!blocked) return null;

  const chosen = pickMostRestrictive(globalResult, pathResult);
  const prefetch = isPrefetchLike(request);

  log({
    level: "warn",
    layer: "proxy",
    message: "rate_limit_block",
    requestId,
    route: pathname,
    method: request.method,
    status: rateLimit.blockStatus,
    event: "rate_limit_exceeded",
    bucket: chosen.which,
    routeLimit: pathConfig.maxRequests,
    ip: maskIpForLog(clientIp),
    limit: chosen.result.limit,
    remaining: chosen.result.remaining,
    reset: chosen.result.reset,
    prefetchSignals: prefetch.signals,
  });

  const acceptHeader = request.headers.get("accept") ?? "";
  const isBrowserNavigation =
    acceptHeader.includes("text/html") && !pathname.startsWith("/api");

  if (isBrowserNavigation) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = rateLimit.tooManyRequestsPath;
    const original = request.nextUrl.pathname + request.nextUrl.search; // includes ?q= etc.
    redirectUrl.searchParams.set("from", original);
    redirectUrl.searchParams.set("bucket", chosen.which);

    return NextResponse.redirect(redirectUrl, rateLimit.redirectStatus);
  }

  const response = NextResponse.json(
    { 
      error: "Rate limit exceeded", 
      requestId, 
      bucket: chosen.which,
      limit: chosen.result.limit,
      remaining: chosen.result.remaining,
      reset: chosen.result.reset,
    },
    { status: rateLimit.blockStatus }
  );

  response.headers.set("X-RateLimit-Bucket", chosen.which);
  response.headers.set("X-RateLimit-Limit", String(chosen.result.limit));
  response.headers.set("X-RateLimit-Remaining", String(chosen.result.remaining));
  response.headers.set("X-RateLimit-Reset", String(chosen.result.reset));
  response.headers.set("Cache-Control", "no-store");

  return response;
}