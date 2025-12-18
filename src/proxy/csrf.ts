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

  if (!isCsrfUnsafeMethod(request.method)) {
    return null;
  }

  if (startsWithAny(pathname, csrf.bypassPrefixes)) {
    return null;
  }
  
  const originHeader = request.headers.get("origin");
  const hostHeader = request.headers.get("host") ?? request.nextUrl.host;

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

  if (!originHeader || originHeader === "null") {
    return blockCsrf(
      "csrf_block_missing_origin",
      "Missing or null origin header (possible CSRF)",
      { origin: originHeader }
    );
  }

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

  return null;
}