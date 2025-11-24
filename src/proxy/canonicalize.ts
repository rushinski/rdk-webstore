// src/proxy/canonicalize.ts
import { NextResponse, type NextRequest } from "next/server";

/**
 * Canonicalize the URL path:
 *  - removes extra slashes
 *  - removes trailing slash (except "/")
 *  - forces lowercase
 *  - resolves "../" segments
 */
export function canonicalizePath(request: NextRequest, requestId: string) {
  const url = request.nextUrl;
  let originalPath = url.pathname;

  const initial = originalPath;

  // 1. Normalize double slashes
  originalPath = originalPath.replace(/\/+$/, "").replace(/\/{2,}/g, "/");

  // 2. Remove trailing slash
  if (originalPath !== "/" && originalPath.endsWith("/")) {
    originalPath = originalPath.slice(0, -1);
  }

  // 3. Lowercase
  originalPath = originalPath.toLowerCase();

  // 4. Resolve "../" segments
  const normalizedUrl = new URL(originalPath, url.origin);

  console.log("canonicalize", {
    layer: "proxy",
    requestId,
    initial,
    normalized: normalizedUrl.pathname,
    event: "canonicalize",
  });

  // Path changed → redirect
  if (normalizedUrl.pathname !== initial) {
    const redirectUrl = new URL(url.toString());
    redirectUrl.pathname = normalizedUrl.pathname;

    const res = NextResponse.redirect(redirectUrl.toString(), 308);
    res.headers.set("x-request-id", requestId);
    return res;
  }

  return null;
}
