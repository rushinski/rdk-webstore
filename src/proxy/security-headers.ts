// src/proxy/security-headers.ts
import type { NextResponse } from "next/server";

import { security } from "@/config/security";

export function applySecurityHeaders(response: NextResponse, nodeEnv: string = process.env.NODE_ENV ?? "development"): void {
  const isDev = nodeEnv !== "production";
  const { securityHeaders } = security.proxy;
  
  const cspDirectives = isDev
    ? securityHeaders.csp.dev
    : securityHeaders.csp.prod;
  
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()"
  );

  const cspHeader = cspDirectives.join("; ");
  response.headers.set("Content-Security-Policy", cspHeader);

  if (!isDev) {
    response.headers.set(
      "Strict-Transport-Security",
      securityHeaders.hsts.value
    );
  }
}