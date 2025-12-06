// src/proxy/csrf.ts
import { NextResponse, type NextRequest } from "next/server";

import { log } from "@/lib/log";

export function checkCsrf(request: NextRequest, requestId: string) {
  const method = request.method.toUpperCase();
  const unsafe = ["POST", "PUT", "PATCH", "DELETE"];

  if (!unsafe.includes(method)) {
    return null;
  }

  const { pathname } = request.nextUrl;

  // Bypass CSRF checks for known non-browser endpoints (e.g. Stripe webhooks)
  const csrfBypassPaths = ["/api/stripe/webhook", "/api/auth/2fa/challenge/verify"];
  if (csrfBypassPaths.some((p) => pathname.startsWith(p))) {
    return null;
  }

  const origin = request.headers.get("origin");
  const host = request.headers.get("host");

  // Rule 1 — Missing Origin header
  if (!origin || origin === "null") {
    log({
      level: "warn",
      layer: "proxy",
      message: "csrf_block_missing_origin",
      requestId: requestId,
      route: pathname,
      status: 403, // Forbidden
      event: "csrf_block",
      origin: origin,
    });

    const res = NextResponse.json(
      { error: "Missing or null origin header (possible CSRF)", requestId },
      { status: 403 },
    );
    return res;
  }

  // Rule 2 — Malformed Origin
  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    log({
      level: "warn",
      layer: "proxy",
      message: "csrf_block_bad_origin",
      requestId: requestId,
      route: pathname,
      status: 403, // Forbidden
      event: "csrf_block",
      origin: origin,
    });

    const res = NextResponse.json(
      { error: "Invalid origin header (possible CSRF)", requestId },
      { status: 403 },
    );
    return res;
  }

  // Rule 3 — Origin mismatch
  if (originHost !== host) {
    log({
      level: "warn",
      layer: "proxy",
      message: "csrf_block_origin_mismatch",
      requestId: requestId,
      route: pathname,
      status: 403, // Forbidden
      event: "csrf_block",
      originHost: originHost,
      host: host,
    });

    const res = NextResponse.json(
      { error: "Origin mismatch (CSRF blocked)", requestId },
      { status: 403 },
    );
    return res;
  }

  // Everything valid
  return null;
}
