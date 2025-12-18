// src/proxy/csrf.ts
import { NextResponse, type NextRequest } from "next/server";

import { log } from "@/lib/log";
import { security, isCsrfUnsafeMethod, startsWithAny } from "@/config/security";

/**
 * Cross-Site Request Forgery (CSRF) protection middleware.
 * 
 * **What is CSRF?**
 * An attack where a malicious website tricks a user's browser into making
 * unwanted requests to OUR application using the user's existing session cookies.
 * 
 * **Example Attack Scenario:**
 * 1. User logs into realdealkickz.com
 * 2. User visits evil.com (in another tab)
 * 3. evil.com contains: <form action="https://realdealkickz.com/api/admin/delete-product" method="POST">
 * 4. Browser automatically sends realdealkickz.com cookies with the request
 * 5. Without CSRF protection, the request succeeds even though it came from evil.com
 * 
 * **Our Protection Strategy:**
 * For state-changing requests (POST, PUT, PATCH, DELETE), we verify the
 * `Origin` header matches our `Host` header. This proves the request
 * originated from our own domain, not a third-party site.
 * 
 * **Why Origin-based?**
 * - Simple and reliable for modern browsers (IE11+ support)
 * - No need for CSRF tokens or session state
 * - Works seamlessly with APIs and single-page apps
 * - Resistant to subdomain attacks (exact match required)
 * 
 * **Bypass Rules:**
 * Some endpoints explicitly opt out of CSRF checks:
 * - Webhook endpoints (Stripe) - verified via signature instead
 * - 2FA verification - uses time-based codes as proof
 * 
 * **Safe Methods:**
 * GET, HEAD, OPTIONS don't modify state, so CSRF doesn't apply.
 * We only check POST, PUT, PATCH, DELETE.
 * 
 * @param request - The incoming Next.js request
 * @param requestId - Correlation ID for logging/tracing
 * 
 * @returns NextResponse when CSRF attack is detected (403 JSON error)
 * @returns null when request is legitimate (allows request to proceed)
 */
export function checkCsrf(
  request: NextRequest,
  requestId: string
): NextResponse | null {
  const { pathname } = request.nextUrl;
  const { csrf } = security.proxy;

  // ==========================================================================
  // SAFETY CHECK: Only check unsafe methods
  // ==========================================================================
  
  // This function should only be called for unsafe methods (POST/PUT/PATCH/DELETE)
  // but we include this guard for defensive programming in case it's called elsewhere
  if (!isCsrfUnsafeMethod(request.method)) {
    return null;
  }

  // ==========================================================================
  // BYPASS RULE: Webhook and special endpoints
  // ==========================================================================
  
  // Some endpoints have their own authentication/verification:
  // - Stripe webhooks use signature verification
  // - 2FA challenge uses time-based codes
  // These don't need (and can't use) Origin-based CSRF protection
  if (startsWithAny(pathname, csrf.bypassPrefixes)) {
    return null;
  }

  // ==========================================================================
  // EXTRACT HEADERS
  // ==========================================================================
  
  const originHeader = request.headers.get("origin");
  const hostHeader = request.headers.get("host") ?? request.nextUrl.host;

  /**
   * Centralized blocking function for consistency.
   * Ensures all CSRF blocks are logged uniformly.
   */
  const blockCsrf = (
    logMessage: string,
    errorMessage: string,
    extraLogData?: Record<string, unknown>
  ): NextResponse => {
    log({
      level: "warn",
      layer: "proxy",
      message: logMessage,
      requestId,
      route: pathname,
      method: request.method,
      status: csrf.blockStatus,
      event: "csrf_block",
      ...extraLogData,
    });

    return NextResponse.json(
      { error: errorMessage, requestId },
      { status: csrf.blockStatus }
    );
  };

  // ==========================================================================
  // RULE 1: Require Origin header
  // ==========================================================================
  
  // Modern browsers ALWAYS send Origin on cross-origin requests
  // Missing Origin on a state-changing request is suspicious
  // 
  // Note: Browsers send Origin: null for some privacy modes, which we also block
  // because attackers can forge Origin: null easily
  if (!originHeader || originHeader === "null") {
    return blockCsrf(
      "csrf_block_missing_origin",
      "Missing or null origin header (possible CSRF)",
      { origin: originHeader }
    );
  }

  // ==========================================================================
  // RULE 2: Validate Origin format
  // ==========================================================================
  
  // Origin must be a valid URL (e.g., "https://realdealkickz.com")
  // Malformed origins indicate tampering or buggy client
  let originHost: string;

  try {
    const originUrl = new URL(originHeader);
    originHost = originUrl.host;
  } catch (parseError) {
    return blockCsrf(
      "csrf_block_malformed_origin",
      "Invalid origin header (possible CSRF)",
      {
        origin: originHeader,
        error: parseError instanceof Error ? parseError.message : String(parseError),
      }
    );
  }

  // ==========================================================================
  // RULE 3: Verify Origin matches Host
  // ==========================================================================
  
  // This is the core CSRF check:
  // - Origin: https://realdealkickz.com
  // - Host: realdealkickz.com
  // They must match exactly (including subdomains)
  // 
  // **Why this works:**
  // - Browser enforces same-origin policy on Origin header
  // - Attacker's site (evil.com) cannot forge Origin to be our domain
  // - If Origin matches Host, request came from our own pages
  if (originHost !== hostHeader) {
    return blockCsrf(
      "csrf_block_origin_mismatch",
      "Origin mismatch (CSRF blocked)",
      {
        originHost,
        hostHeader,
      }
    );
  }

  // ==========================================================================
  // SUCCESS: CSRF checks passed
  // ==========================================================================
  
  // Origin matches Host - request is legitimate
  return null;
}