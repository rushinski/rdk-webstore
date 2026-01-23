// src/proxy/csrf.ts
import { NextResponse, type NextRequest } from "next/server";

import { log } from "@/lib/log";
import { security, isCsrfUnsafeMethod } from "@/config/security";

const matchesBypassPrefix = (pathname: string, prefixes: readonly string[]): boolean =>
  prefixes.some((prefix) => {
    const normalized =
      prefix.endsWith("/") && prefix !== "/" ? prefix.slice(0, -1) : prefix;
    return pathname === normalized || pathname.startsWith(`${normalized}/`);
  });

export function checkCsrf(request: NextRequest, requestId: string): NextResponse | null {
  const { pathname } = request.nextUrl;
  const { csrf } = security.proxy;

  if (!isCsrfUnsafeMethod(request.method)) {
    return null;
  }

  if (matchesBypassPrefix(pathname, csrf.bypassPrefixes)) {
    return null;
  }

  const originHeader = request.headers.get("origin");
  const hostHeader = request.headers.get("host") ?? request.nextUrl.host;

  const blockCsrf = (
    logMessage: string,
    errorMessage: string,
    extraLogData?: Record<string, unknown>,
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
      { status: csrf.blockStatus },
    );
  };

  if (!originHeader || originHeader === "null") {
    return blockCsrf(
      "csrf_block_missing_origin",
      "Missing or null origin header (possible CSRF)",
      { origin: originHeader },
    );
  }

  if (originHeader.trim() !== originHeader) {
    return blockCsrf(
      "csrf_block_origin_whitespace",
      "Invalid origin header (possible CSRF)",
      { origin: originHeader },
    );
  }

  if (originHeader.length > csrf.maxOriginLength) {
    return blockCsrf(
      "csrf_block_origin_too_long",
      "Origin header too long (possible CSRF)",
      { origin: originHeader },
    );
  }

  if (/[^\x00-\x7F]/.test(originHeader)) {
    return blockCsrf(
      "csrf_block_origin_non_ascii",
      "Origin header contains invalid characters (possible CSRF)",
      { origin: originHeader },
    );
  }

  let originHost: string;
  let originProtocol: string;

  try {
    const originUrl = new URL(originHeader);
    originHost = originUrl.host;
    originProtocol = originUrl.protocol.toLowerCase();

    if (originUrl.username || originUrl.password) {
      return blockCsrf(
        "csrf_block_origin_credentials",
        "Origin header contains credentials (possible CSRF)",
        { origin: originHeader },
      );
    }

    if (!["http:", "https:"].includes(originProtocol)) {
      return blockCsrf(
        "csrf_block_invalid_protocol",
        "Invalid origin protocol (possible CSRF)",
        { origin: originHeader, originProtocol },
      );
    }
  } catch (parseError) {
    return blockCsrf(
      "csrf_block_malformed_origin",
      "Invalid origin header (possible CSRF)",
      {
        origin: originHeader,
        error: parseError instanceof Error ? parseError.message : String(parseError),
      },
    );
  }

  const requestProtocol = request.nextUrl.protocol.toLowerCase();
  if (originProtocol !== requestProtocol) {
    return blockCsrf(
      "csrf_block_protocol_mismatch",
      "Origin protocol mismatch (CSRF blocked)",
      {
        originProtocol,
        requestProtocol,
      },
    );
  }

  if (originHost.toLowerCase() !== hostHeader.toLowerCase()) {
    return blockCsrf("csrf_block_origin_mismatch", "Origin mismatch (CSRF blocked)", {
      originHost,
      hostHeader,
    });
  }

  return null;
}
