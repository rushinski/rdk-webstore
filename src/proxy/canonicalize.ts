// src/proxy/canonicalize.ts
import { NextResponse, type NextRequest } from "next/server";

import { log } from "@/lib/log";
import { security } from "@/config/security";

/**
 * Path canonicalization middleware for SEO and security.
 * 
 * **Why canonicalize paths?**
 * 
 * **1. SEO Benefits:**
 * - Prevents duplicate content penalties from search engines
 * - Example: /Products/Nike vs /products/nike (same content, different URLs)
 * - Canonical URL consolidates ranking signals
 * 
 * **2. Security Benefits:**
 * - Prevents path traversal attacks via dot segments
 * - Example: /admin/../api/secret → /api/secret
 * - Prevents cache poisoning via inconsistent paths
 * - Simplifies security rule matching (all paths normalized)
 * 
 * **3. Consistency Benefits:**
 * - Simpler logging and analytics (one canonical path per resource)
 * - Easier debugging (no need to account for path variations)
 * - Better cache hit rates (variations don't bypass cache)
 * 
 * **Normalization rules:**
 * 1. Collapse multiple slashes: //products → /products
 * 2. Remove trailing slashes: /products/ → /products (except root /)
 * 3. Lowercase pathname: /Products → /products
 * 4. Resolve dot segments: /admin/../api → /api
 * 5. Ensure leading slash: products → /products
 * 
 * **Query parameters:**
 * Query strings are preserved exactly as-is (not normalized).
 * Example: /products?Sort=DESC → /products?Sort=DESC
 * 
 * **Redirect behavior:**
 * - Uses 308 Permanent Redirect (preserves method and body)
 * - Alternative: 301 is more common but changes POST to GET
 * 
 * @param request - The incoming Next.js request
 * @param requestId - Correlation ID for logging/tracing
 * 
 * @returns NextResponse redirect when path needs normalization
 * @returns null when path is already canonical (allows request to proceed)
 */
export function canonicalizePath(
  request: NextRequest,
  requestId: string
): NextResponse | null {
  const url = request.nextUrl;
  const rawPathname = url.pathname;
  const { canonicalize } = security.proxy;

  let canonicalPathname = rawPathname;

  // ==========================================================================
  // RULE 1: Collapse multiple slashes
  // ==========================================================================
  
  // Example: /products//nike///air → /products/nike/air
  // Why: Multiple slashes can bypass caching and security rules
  if (canonicalize.collapseMultipleSlashes) {
    canonicalPathname = canonicalPathname.replace(/\/{2,}/g, "/");
  }

  // ==========================================================================
  // RULE 2: Remove trailing slash (but never turn "/" into "")
  // ==========================================================================
  
  // Example: /products/ → /products
  // Exception: / stays as / (root path)
  // Why: Consistent URLs improve SEO and prevent duplicate content
  if (canonicalize.removeTrailingSlash && canonicalPathname.length > 1) {
    canonicalPathname = canonicalPathname.replace(/\/+$/, "");
  }

  // ==========================================================================
  // RULE 3: Lowercase pathname
  // ==========================================================================
  
  // Example: /Products/Nike → /products/nike
  // Why: URLs are case-sensitive but shouldn't be for our app
  // Note: Query params are NOT lowercased (might be case-sensitive IDs)
  if (canonicalize.lowercasePathname) {
    canonicalPathname = canonicalPathname.toLowerCase();
  }

  // ==========================================================================
  // RULE 4: Ensure absolute path
  // ==========================================================================
  
  // Example: products/nike → /products/nike
  // Why: Defensive against malformed clients
  if (!canonicalPathname.startsWith("/")) {
    canonicalPathname = `/${canonicalPathname}`;
  }

  // ==========================================================================
  // RULE 5: Resolve dot segments (path traversal protection)
  // ==========================================================================
  
  // Example: /admin/../api/secret → /api/secret
  // Example: /products/./nike → /products/nike
  // Why: Prevents path traversal attacks and cache confusion
  // 
  // We use URL constructor to safely resolve dots:
  // - ".." navigates up one level
  // - "." is current directory (no-op)
  // - URL spec handles edge cases correctly
  const resolved = new URL(canonicalPathname, url.origin);
  canonicalPathname = resolved.pathname;

  // ==========================================================================
  // CHECK: Is normalization needed?
  // ==========================================================================
  
  // If path hasn't changed, no redirect needed
  if (canonicalPathname === rawPathname) {
    return null;
  }

  // ==========================================================================
  // REDIRECT: Path needs canonicalization
  // ==========================================================================
  
  // Log the canonicalization for observability
  // This is high-signal data: shows us SEO issues and potential attacks
  log({
    level: "info",
    layer: "proxy",
    message: "canonicalize_redirect",
    requestId,
    route: rawPathname,
    status: canonicalize.redirectStatus,
    event: "path_normalization",
    canonicalPathname,
  });

  // Build redirect URL preserving query params and fragment
  // Example: /Products/Nike?size=10#reviews → /products/nike?size=10#reviews
  const redirectUrl = new URL(url.toString());
  redirectUrl.pathname = canonicalPathname;

  return NextResponse.redirect(
    redirectUrl.toString(),
    canonicalize.redirectStatus
  );
}