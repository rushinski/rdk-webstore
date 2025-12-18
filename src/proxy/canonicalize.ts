// src/proxy/canonicalize.ts
import { NextResponse, type NextRequest } from "next/server";

import { log } from "@/lib/log";
import { security } from "@/config/security";

export function canonicalizePath(
  request: NextRequest,
  requestId: string
): NextResponse | null {
  const url = request.nextUrl;
  const rawPathname = url.pathname;

  const { canonicalize } = security.proxy;

  let canonicalPathname = rawPathname;

  // Collapse multi-slashes first: "/products//nike" -> "/products/nike"
  if (canonicalize.collapseMultipleSlashes) {
    canonicalPathname = canonicalPathname.replace(/\/{2,}/g, "/");
  }

  // Remove trailing slash, but never turn "/" into ""
  if (canonicalize.removeTrailingSlash && canonicalPathname.length > 1) {
    canonicalPathname = canonicalPathname.replace(/\/+$/, "");
  }

  // Lowercase pathname (query params are not touched)
  if (canonicalize.lowercasePathname) {
    canonicalPathname = canonicalPathname.toLowerCase();
  }

  // Ensure pathname is always absolute
  if (!canonicalPathname.startsWith("/")) {
    canonicalPathname = `/${canonicalPathname}`;
  }

  // Resolve dot segments safely (e.g. "/admin/../audit" => "/audit")
  const resolved = new URL(canonicalPathname, url.origin);
  canonicalPathname = resolved.pathname;

  // No change -> no redirect
  if (canonicalPathname === rawPathname) return null;

  // High-signal log: redirects are worth logging in the canonicalize subsystem
  log({
    level: "info",
    layer: "proxy",
    message: "canonicalize_redirect",
    requestId,
    route: rawPathname,
    status: canonicalize.redirectStatus,
    canonicalPathname,
    event: "path_normalization",
  });

  // Preserve query params by cloning the full URL and only swapping pathname
  const redirectUrl = new URL(url.toString());
  redirectUrl.pathname = canonicalPathname;

  return NextResponse.redirect(redirectUrl.toString(), canonicalize.redirectStatus);
}
