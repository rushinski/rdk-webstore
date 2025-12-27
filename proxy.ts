// proxy.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { security, startsWithAny, isCsrfUnsafeMethod } from "@/config/security";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import { applyRateLimit } from "@/proxy/rate-limit";
import { protectAdminRoute } from "@/proxy/auth";
import { checkCsrf } from "@/proxy/csrf";
import { checkBot } from "@/proxy/bot";
import { canonicalizePath } from "@/proxy/canonicalize";
import { finalizeProxyResponse } from "@/proxy/finalize";

/**
 * Main proxy middleware orchestrator.
 * 
 * **Architecture:**
 * This middleware runs on EVERY request before they reach route handlers.
 * It implements defense-in-depth security through layered checks.
 * 
 * **Execution order matters:**
 * 1. Canonicalization (SEO/security normalization)
 * 2. Request ID forwarding (for log correlation)
 * 3. Bot detection (lightweight UA check)
 * 4. CSRF protection (origin validation)
 * 5. Rate limiting (abuse prevention)
 * 6. Admin authentication (layered admin guard)
 * 
 * **Why this order?**
 * 
 * **Canonicalization first:**
 * - Redirects happen before ANY other processing
 * - Ensures all downstream code sees normalized paths
 * - Prevents bypass via path variations
 * 
 * **Request ID early:**
 * - Generated once, used everywhere
 * - Forwarded to downstream requests for correlation
 * - Included in all logs and error responses
 * 
 * **Bot check before rate limit:**
 * - Bot check is CPU-only (no external calls)
 * - Filters obvious bots before hitting Redis
 * - Reduces rate limiter load
 * 
 * **CSRF before rate limit:**
 * - CSRF is header-only (no external calls)
 * - Blocks cross-site attacks early
 * - Invalid origin shouldn't count against rate limit
 * 
 * **Rate limit before admin auth:**
 * - Rate limit protects admin login from brute force
 * - Cheaper than Supabase queries
 * - Applies to all protected routes (not just admin)
 * 
 * **Admin auth last:**
 * - Most expensive check (Supabase queries)
 * - Only runs on admin routes
 * - All other checks passed first
 * 
 * **Selective application:**
 * Not all checks run on all routes:
 * - Bot check: Admin, API, auth, products only
 * - CSRF: POST/PUT/PATCH/DELETE only
 * - Rate limit: API, admin, auth, checkout only
 * - Admin guard: Admin routes only (with exemptions)
 * 
 * **Matcher configuration:**
 * The `config.matcher` at the bottom excludes:
 * - Next.js internals (_next)
 * - Static assets (public folder)
 * - Common static files (favicon, robots.txt, sitemap.xml)
 * 
 * **Performance:**
 * - Fast path (static page): <1ms (just headers)
 * - API request: ~10-20ms (includes rate limit)
 * - Admin request: ~50-100ms (includes Supabase)
 * 
 * @param request - The incoming Next.js request
 * 
 * @returns NextResponse (finalized with headers)
 */
export async function proxy(request: NextRequest): Promise<NextResponse> {
  // ==========================================================================
  // STEP 0: Generate request ID for distributed tracing
  // ==========================================================================
  
  // Use Web Crypto API (edge-compatible) to generate UUID
  // This ID will be:
  // - Added to response headers (x-request-id)
  // - Forwarded to route handlers
  // - Included in all logs
  // - Used for error tracking correlation
  const requestId = `req_${globalThis.crypto.randomUUID()}`;
  const { pathname, hostname } = request.nextUrl;
  const isLocalhost =
    hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
  const isLocalDev = process.env.NODE_ENV !== "production" && isLocalhost;

  // ==========================================================================
  // STEP 1: Canonicalization (happens BEFORE everything else)
  // ==========================================================================
  
  // Normalize paths for SEO and security
  // If path needs normalization, returns redirect response immediately
  const canonicalizeResponse = canonicalizePath(request, requestId);

  if (canonicalizeResponse) {
    // Path was normalized - return redirect response
    // (finalized with headers and request ID)
    return finalizeProxyResponse(canonicalizeResponse, requestId);
  }

  // Path is already canonical - continue processing

  // ==========================================================================
  // STEP 2: Forward request ID to downstream handlers
  // ==========================================================================
  
  // Clone request headers and add our request ID
  // This allows route handlers and services to use the same ID for logging
  const forwardedHeaders = new Headers(request.headers);
  forwardedHeaders.set(security.proxy.requestIdHeader, requestId);

  // Create base pass-through response
  // This will be returned if all checks pass (no middleware blocks)
  let response = NextResponse.next({
    request: { headers: forwardedHeaders },
  });

  // Finalize the response early (add headers)
  // We might return this directly if no checks fail
  response = finalizeProxyResponse(response, requestId);

  // ==========================================================================
  // STEP 3: Bot detection (selective routes)
  // ==========================================================================
  
  // Only check bot patterns on high-value routes
  // Configured in security.proxy.botCheckPrefixes
  if (!isLocalDev && startsWithAny(pathname, security.proxy.botCheckPrefixes)) {
    const botResponse = checkBot(request, requestId);

    if (botResponse) {
      // Bot detected - return block response
      return finalizeProxyResponse(botResponse, requestId);
    }
  }

  // Traffic appears legitimate - continue

  // ==========================================================================
  // STEP 4: CSRF protection (state-changing methods only)
  // ==========================================================================
  
  // Only check CSRF on unsafe HTTP methods (POST, PUT, PATCH, DELETE)
  // GET, HEAD, OPTIONS are idempotent and don't need CSRF protection
  if (isCsrfUnsafeMethod(request.method)) {
    const csrfResponse = checkCsrf(request, requestId);

    if (csrfResponse) {
      // CSRF attack detected - return block response
      return finalizeProxyResponse(csrfResponse, requestId);
    }
  }

  // Origin matches host - continue

  // ==========================================================================
  // STEP 5: Rate limiting (selective routes)
  // ==========================================================================
  
  // Apply rate limits to API, admin, auth, and checkout routes
  // This prevents:
  // - Brute force attacks on login
  // - API abuse and scraping
  // - Checkout spam
  // - Admin dashboard attacks
  if (!isLocalDev && startsWithAny(pathname, security.proxy.rateLimitPrefixes)) {
    const rateLimitResponse = await applyRateLimit(request, requestId);

    if (rateLimitResponse) {
      // Rate limit exceeded - return block response
      return finalizeProxyResponse(rateLimitResponse, requestId);
    }
  }

  // Within rate limits - continue

  // ==========================================================================
  // STEP 6: Admin authentication guard
  // ==========================================================================
  
  // Check if this is an admin route
  const isAdminArea = startsWithAny(
    pathname,
    security.proxy.adminGuard.protectedPrefixes
  );

  // Check if this route has an explicit exemption
  // (e.g., 2FA verification endpoints that need to be accessible)
  const isExemptRoute = startsWithAny(
    pathname,
    security.proxy.adminGuard.exemptPrefixes
  );

  // Only run admin guard on admin routes without exemptions
  if (isAdminArea && !isExemptRoute) {
    // Create Supabase client for authentication checks
    // This uses the request's cookies to get the user session
    const supabase = await createSupabaseServerClient();

    // Run multi-layered admin authentication
    // Checks: Supabase session + profile role + admin token + MFA
    const adminResponse = await protectAdminRoute(request, requestId, supabase);

    if (adminResponse) {
      // Admin checks failed - return block/redirect response
      return finalizeProxyResponse(adminResponse, requestId);
    }
  }

  // Admin checks passed (or not applicable) - continue

  // ==========================================================================
  // SUCCESS: All checks passed
  // ==========================================================================
  
  // Return the pass-through response (already finalized with headers)
  return response;
}

/**
 * Middleware matcher configuration.
 * 
 * **What this does:**
 * Tells Next.js which routes should run through the proxy middleware.
 * 
 * **Current pattern: /((?!_next|static|favicon.ico|robots.txt|sitemap.xml).*)**
 * 
 * **Translation:**
 * - Run middleware on ALL routes
 * - EXCEPT: _next, static, favicon.ico, robots.txt, sitemap.xml
 * 
 * **Why exclude these?**
 * - _next/*: Next.js internal routes (builds, HMR, etc.)
 * - static/*: Public static assets (images, fonts, etc.)
 * - favicon.ico: Browsers request this automatically
 * - robots.txt: Search engine crawler instructions
 * - sitemap.xml: Search engine sitemap
 * 
 * **Performance impact:**
 * Excluding these routes means:
 * - Faster static asset delivery (no middleware overhead)
 * - Reduced load on rate limiter and Supabase
 * - Less noise in logs
 * 
 * **Security note:**
 * Static assets don't need proxy protection because:
 * - They're public by definition
 * - No authentication or sensitive data
 * - Served directly by CDN (faster)
 */
export const config = {
  matcher: [
    /*
     * Match all routes EXCEPT:
     * - _next (Next.js internals)
     * - static (public assets)
     * - favicon.ico, robots.txt, sitemap.xml (common static files)
     */
    "/((?!_next|static|favicon.ico|robots.txt|sitemap.xml).*)",
  ],
};
