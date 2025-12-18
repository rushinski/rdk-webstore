// src/proxy/csrf.ts
import { NextResponse, type NextRequest } from "next/server";

import { log } from "@/lib/log";
import { security, isCsrfUnsafeMethod, startsWithAny } from "@/config/security";

export function checkCsrf(
  request: NextRequest,
  requestId: string
): NextResponse | null {
  const { pathname } = request.nextUrl;
  const { csrf } = security.proxy;

  // Safety guard: proxy.ts should already gate this, but keep it here
  // so the subsystem is correct if reused elsewhere.
  if (!isCsrfUnsafeMethod(request.method)) return null;

  // Bypass CSRF checks for known non-browser endpoints (e.g. Stripe webhooks)
  if (startsWithAny(pathname, csrf.bypassPrefixes)) return null;

  const origin = request.headers.get("origin");
  const host = request.headers.get("host") ?? request.nextUrl.host;

  const block = (message: string, error: string, extra?: Record<string, unknown>) => {
    log({
      level: "warn",
      layer: "proxy",
      message,
      requestId,
      route: pathname,
      status: csrf.blockStatus,
      event: "csrf_block",
      ...(extra ?? {}),
    });

    return NextResponse.json({ error, requestId }, { status: csrf.blockStatus });
  };

  // Rule 1 — Missing Origin header (or explicitly "null")
  if (!origin || origin === "null") {
    return block(
      "csrf_block_missing_origin",
      "Missing or null origin header (possible CSRF)",
      { origin }
    );
  }

  // Rule 2 — Malformed Origin
  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    return block(
      "csrf_block_bad_origin",
      "Invalid origin header (possible CSRF)",
      { origin }
    );
  }

  // Rule 3 — Origin mismatch
  if (originHost !== host) {
    return block(
      "csrf_block_origin_mismatch",
      "Origin mismatch (CSRF blocked)",
      { originHost, host }
    );
  }

  return null;
}
