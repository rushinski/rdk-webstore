import type { NextResponse } from "next/server";

export function applySecurityHeaders(response: NextResponse) {
  // Core security headers
  response.headers.set("X-Frame-Options", "DENY"); // Prevents site from being placed inside a <iframe> = mitigates clickjacking
  response.headers.set("X-Content-Type-Options", "nosniff"); // Prevents MIME-type spoofing = protects script/style execution
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin"); // Sends only the origin on external navs = protects URL leakage
  // Explicitly disables browser features you're not using
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()"
  );

  // Controls where scripts, styles, images, frames, and network requests may come from
  response.headers.set(
    "Content-Security-Policy",
    [
      "default-src 'self'", // Ressources can only come from my domain
      "img-src 'self' https: data:", // Images can only come from my down, any https url, or URIs
      "script-src 'self'",  // Scripts can only be ran from my own domain
      "style-src 'self' 'unsafe-inline'", // Styles may only come from my domain
      "object-src 'none'", // Prevents embedding
      "base-uri 'self'", // <base> HTML tag must come from my own origin
      "connect-src 'self' https:", // Blocks insecure HTTP connections
      "frame-ancestors 'none'", // Prevents embedding inside <iframe> on site. Redundant but safe
    ].join("; ")
  );

  // HSTS - production only
  if (process.env.NODE_ENV === "production") {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=63072000; includeSubDomains; preload"
    );
  }

  return response;
}
