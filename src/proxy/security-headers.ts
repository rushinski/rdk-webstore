// src/proxy/security-headers.ts
import type { NextResponse } from "next/server";

import { security } from "@/config/security";

/**
 * Applies defense-in-depth security headers to every response.
 * 
 * **Why these headers?**
 * Modern browsers support many security features, but they're opt-in.
 * Without these headers, browsers use insecure defaults for backwards compatibility.
 * 
 * **Headers applied:**
 * 
 * **1. Content-Security-Policy (CSP)**
 * - Prevents XSS, clickjacking, code injection
 * - Restricts where scripts/styles/images can load from
 * - Different policies for dev (relaxed) vs prod (strict)
 * 
 * **2. Strict-Transport-Security (HSTS) [Prod only]**
 * - Forces HTTPS for all future requests (prevents downgrade attacks)
 * - Includes subdomains
 * - Preload-ready (can submit to browser preload lists)
 * 
 * **3. X-Frame-Options: DENY**
 * - Prevents page from being embedded in <iframe>
 * - Defends against clickjacking attacks
 * - Also enforced via CSP frame-ancestors
 * 
 * **4. X-Content-Type-Options: nosniff**
 * - Prevents MIME-sniffing attacks
 * - Forces browsers to respect Content-Type header
 * 
 * **5. Referrer-Policy**
 * - Controls what referrer info is sent with requests
 * - Balance between privacy and functionality
 * 
 * **6. Permissions-Policy**
 * - Disables unnecessary browser features
 * - Prevents camera/microphone/geolocation access
 * 
 * **CSP Development vs Production:**
 * 
 * **Dev mode:**
 * - Allows unsafe-inline/unsafe-eval for hot reload
 * - Allows localhost WebSocket connections
 * - More permissive for developer tools
 * 
 * **Production mode:**
 * - Strict CSP with Stripe-specific allowlist
 * - No unsafe-inline/unsafe-eval
 * - HSTS enabled
 * 
 * **Future improvements:**
 * - Add CSP nonces for inline scripts (remove unsafe-inline)
 * - Add CSP reporting endpoint
 * - Consider Subresource Integrity (SRI) for CDN assets
 * 
 * @param response - The NextResponse object to apply headers to
 * 
 * @returns void (mutates response in place)
 */
export function applySecurityHeaders(response: NextResponse, nodeEnv: string = process.env.NODE_ENV ?? "development"): void {
  const isDev = nodeEnv !== "production";
  const { securityHeaders } = security.proxy;

  // ==========================================================================
  // SELECT CSP POLICY (DEV VS PROD)
  // ==========================================================================
  
  const cspDirectives = isDev
    ? securityHeaders.csp.dev
    : securityHeaders.csp.prod;

  // ==========================================================================
  // APPLY UNIVERSAL HEADERS (DEV + PROD)
  // ==========================================================================
  
  // Prevent clickjacking
  response.headers.set("X-Frame-Options", "DENY");

  // Prevent MIME-sniffing
  response.headers.set("X-Content-Type-Options", "nosniff");

  // Control referrer behavior
  // strict-origin-when-cross-origin:
  // - Same-origin: Send full URL
  // - Cross-origin HTTPS: Send origin only
  // - Cross-origin HTTP: Send nothing
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  // Disable unnecessary browser features
  // Format: feature=(allowed-origins)
  // Empty () means "deny all"
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()"
  );

  // ==========================================================================
  // APPLY CONTENT SECURITY POLICY
  // ==========================================================================
  
  // Join CSP directives with semicolon+space (standard format)
  // Example: "default-src 'self'; script-src 'self' https://js.stripe.com"
  const cspHeader = cspDirectives.join("; ");
  response.headers.set("Content-Security-Policy", cspHeader);

  // ==========================================================================
  // APPLY HSTS (PRODUCTION ONLY)
  // ==========================================================================
  
  // HSTS forces HTTPS for all future requests
  // Only enable in production (no HTTPS in local dev)
  if (!isDev) {
    // max-age=63072000: 2 years in seconds
    // includeSubDomains: Apply to all subdomains
    // preload: Ready for browser preload list submission
    response.headers.set(
      "Strict-Transport-Security",
      securityHeaders.hsts.value
    );
  }
}