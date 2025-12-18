// src/proxy/rate-limit.ts
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { NextResponse, type NextRequest } from "next/server";

import { log } from "@/lib/log";
import { env } from "@/config/env";
import { security } from "@/config/security";

/**
 * Upstash Redis client for edge-compatible rate limiting.
 * 
 * **Why Upstash?**
 * - Edge-native: Works on Vercel/Cloudflare edge functions
 * - REST-based: No persistent connections (unlike traditional Redis)
 * - Global: Low-latency from any edge region
 * - Managed: No infrastructure to maintain
 * 
 * **Environment validation:**
 * The env config module (src/config/env.ts) ensures these keys exist at build time.
 */
const redis = new Redis({
  url: env.UPSTASH_REDIS_REST_URL!,
  token: env.UPSTASH_REDIS_REST_TOKEN!,
});

/**
 * Rate limiter instance using sliding window algorithm.
 * 
 * **Algorithm: Sliding Window**
 * - More accurate than fixed windows (prevents burst at window boundaries)
 * - Allows exactly N requests per time window
 * - Window slides continuously, not in discrete buckets
 * 
 * **Current limits (configured in security.ts):**
 * - 30 requests per minute per IP (default)
 * - Applied to: /api/*, /admin/*, /auth/*, /checkout/*
 * 
 * **Future enhancements:**
 * - Per-route limits (e.g., stricter for /auth/login)
 * - Per-user limits (after authentication)
 * - Adaptive limits based on behavior patterns
 */
const rateLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(
    security.proxy.rateLimit.maxRequests,
    security.proxy.rateLimit.window
  ),
});

/**
 * Extracts the client's IP address from request headers.
 * 
 * **Header priority:**
 * 1. x-forwarded-for (standard proxy header, can contain chain)
 * 2. x-real-ip (some proxies use this)
 * 3. Fallback to "unknown" (shouldn't happen on Vercel)
 * 
 * **Why the first IP in x-forwarded-for?**
 * Header format: "client-ip, proxy1-ip, proxy2-ip"
 * The first IP is the original client, subsequent IPs are proxy chain.
 * 
 * @param request - The incoming Next.js request
 * @returns Client IP address string
 */
function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for");

  if (forwardedFor) {
    // Take first IP in the chain (original client)
    const firstIp = forwardedFor.split(",")[0]?.trim();
    if (firstIp) return firstIp;
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp;

  return "unknown";
}

/**
 * Masks IP address for privacy-conscious logging.
 * 
 * **Why mask IPs?**
 * - GDPR/privacy compliance: Full IPs are PII in some jurisdictions
 * - Still useful for debugging: Subnet is preserved
 * - Prevents log-based IP harvesting
 * 
 * **Masking strategy:**
 * - IPv4: Keep first 3 octets (e.g., 192.168.1.xxx)
 * - IPv6: Keep first 2 segments (e.g., 2001:db8::/64)
 * - Unknown: Leave as-is
 * 
 * @param ip - Raw IP address string
 * @returns Masked IP address for logging
 */
function maskIpForLog(ip: string): string {
  if (ip === "unknown") return ip;

  // IPv4 masking: 192.168.1.100 → 192.168.1.xxx
  if (ip.includes(".")) {
    const parts = ip.split(".");
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.${parts[2]}.xxx`;
    }
    return ip; // Malformed IPv4, return as-is
  }

  // IPv6 masking: 2001:0db8:85a3:0000:0000:8a2e:0370:7334 → 2001:db8::/??
  if (ip.includes(":")) {
    const parts = ip.split(":").filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0]}:${parts[1]}::/??`;
    }
    return ip; // Malformed IPv6, return as-is
  }

  // Neither IPv4 nor IPv6 format recognized
  return ip;
}

/**
 * Applies rate limiting to protect against abuse and DDoS.
 * 
 * **Protection goals:**
 * - Prevent brute-force attacks (login, checkout)
 * - Mitigate scraping/data harvesting
 * - Limit impact of DDoS attempts
 * - Protect backend resources (Supabase, Stripe)
 * 
 * **Behavior:**
 * - Allows requests under the limit
 * - Returns 429 with metadata when limit exceeded
 * - For browser requests: Redirects to friendly error page
 * - For API requests: Returns JSON error
 * 
 * **Headers exposed:**
 * - X-RateLimit-Limit: Total allowed requests
 * - X-RateLimit-Remaining: Requests left in current window
 * - X-RateLimit-Reset: Unix timestamp when window resets
 * 
 * **Special handling:**
 * Never rate-limit the error page itself (prevents redirect loop).
 * 
 * @param request - The incoming Next.js request
 * @param requestId - Correlation ID for logging/tracing
 * 
 * @returns NextResponse when rate limit exceeded (429 error or redirect)
 * @returns null when request is within limits (allows request to proceed)
 */
export async function applyRateLimit(
  request: NextRequest,
  requestId: string
): Promise<NextResponse | null> {
  const { pathname } = request.nextUrl;
  const clientIp = getClientIp(request);
  const { rateLimit } = security.proxy;

  // ==========================================================================
  // SAFETY CHECK: Prevent redirect loop
  // ==========================================================================
  
  // Never rate-limit the "too many requests" error page itself
  // Otherwise rate-limited users get stuck in an infinite redirect loop
  if (pathname === rateLimit.tooManyRequestsPath) {
    return null;
  }

  // ==========================================================================
  // CHECK RATE LIMIT
  // ==========================================================================
  
  // Use IP as the rate limit key
  // Future: Could add per-user limits using `${ip}:${userId}` as key
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
    return null; // fail-open
  }

  // Request is within limits - allow through
  if (result.success) {
    return null;
  }

  // ==========================================================================
  // RATE LIMIT EXCEEDED - BLOCK REQUEST
  // ==========================================================================
  
  // Log the rate limit violation with helpful metadata
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

    // Upstash metadata (helps with debugging patterns)
    limit: result.limit,
    remaining: result.remaining,
    reset: result.reset, // Unix timestamp
  });

  // Determine if this is a browser navigation or API request
  const acceptHeader = request.headers.get("accept") ?? "";
  const isBrowserNavigation =
    acceptHeader.includes("text/html") && !pathname.startsWith("/api");

  // ==========================================================================
  // RESPONSE TYPE 1: Browser Navigation
  // ==========================================================================
  
  if (isBrowserNavigation) {
    // Redirect to a friendly error page
    // This provides a better UX than a raw 429 error
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = rateLimit.tooManyRequestsPath;
    
    // Include the original route in query string so error page can show context
    redirectUrl.searchParams.set("from", pathname);

    return NextResponse.redirect(redirectUrl, rateLimit.redirectStatus);
  }

  // ==========================================================================
  // RESPONSE TYPE 2: API/JSON Request
  // ==========================================================================
  
  // Return standard 429 JSON error
  const response = NextResponse.json(
    { error: "Rate limit exceeded", requestId },
    { status: rateLimit.blockStatus }
  );

  // Expose rate limit metadata to clients (RFC 6585 compliance)
  // These headers help well-behaved clients implement exponential backoff
  response.headers.set("X-RateLimit-Limit", String(result.limit));
  response.headers.set("X-RateLimit-Remaining", String(result.remaining));
  response.headers.set("X-RateLimit-Reset", String(result.reset));

  // Never cache rate limit responses
  // Ensures clients always get fresh limit info on retry
  response.headers.set("Cache-Control", "no-store");

  return response;
}