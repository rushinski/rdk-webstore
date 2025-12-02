// src/proxy/security-headers.ts
import type { NextResponse } from "next/server";

export function applySecurityHeaders(response: NextResponse) {
  const isDev = process.env.NODE_ENV !== "production";

  //
  // Shared headers (dev + prod)
  //
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");

  //
  // Development CSP (relaxed for local testing)
  //
  if (isDev) {
    response.headers.set(
      "Content-Security-Policy",
      [
        "default-src 'self'",
        "img-src 'self' data: https:",
        "style-src 'self' 'unsafe-inline'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Next.js dev mode
        [
          "connect-src",
          "'self'",
          "ws://localhost:*",
          "http://localhost:*",
          "http://127.0.0.1:*",        // <-- Added for local Supabase CLI
          "https:"
        ].join(" "),
        "object-src 'none'",
        "base-uri 'self'",
        "frame-ancestors 'none'",
      ].join("; ")
    );

    return response;
  }

  //
  // Production CSP (strict — do not relax)
  //
  response.headers.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "img-src 'self' https: data:",
      "script-src 'self'",
      "style-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "connect-src 'self' https:",
      "frame-ancestors 'none'",
    ].join("; ")
  );

  response.headers.set(
    "Strict-Transport-Security",
    "max-age=63072000; includeSubDomains; preload"
  );

  return response;
}
