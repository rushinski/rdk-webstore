// src/proxy/security-headers.ts
import type { NextResponse } from "next/server";

export function applySecurityHeaders(response: NextResponse) {
  // Core security headers
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()"
  );

  // Content Security Policy (MVP)
  response.headers.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "img-src 'self' https: data:",
      "script-src 'self'", // no unsafe-inline by default
      "style-src 'self' 'unsafe-inline'", // allowed for MVP
      "object-src 'none'",
      "base-uri 'self'",
      "connect-src 'self' https:",
      "frame-ancestors 'none'",
    ].join("; ")
  );

  // HSTS — production only
  if (process.env.NODE_ENV === "production") {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=63072000; includeSubDomains; preload"
    );
  }

  return response;
}
