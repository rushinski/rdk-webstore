// src/proxy/security-headers.ts
import type { NextResponse } from "next/server";

import { security } from "@/config/security";

/**
 * Applies baseline security headers to every proxied response.
 *
 * Style rule: this function only mutates `response` (no returns).
 * `finalizeProxyResponse()` remains the single place that returns the response.
 *
 * CSP note:
 * - Dev is relaxed for local workflows.
 * - Prod is strict-ish but still compatible with Next.js + Stripe for MVP.
 *   If you later implement CSP nonces, we can remove 'unsafe-inline'.
 */
export function applySecurityHeaders(response: NextResponse): void {
  const isDev = process.env.NODE_ENV !== "production";
  const cspDirectives = isDev
    ? security.proxy.securityHeaders.csp.dev
    : security.proxy.securityHeaders.csp.prod;

  // Shared headers (dev + prod)
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()"
  );

  // Content Security Policy
  response.headers.set("Content-Security-Policy", cspDirectives.join("; "));

  // HSTS (production only)
  if (!isDev) {
    response.headers.set(
      "Strict-Transport-Security",
      security.proxy.securityHeaders.hsts.value
    );
  }
}
