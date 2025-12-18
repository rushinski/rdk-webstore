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

  if (canonicalize.collapseMultipleSlashes) {
    canonicalPathname = canonicalPathname.replace(/\/{2,}/g, "/");
  }

  if (canonicalize.removeTrailingSlash && canonicalPathname.length > 1) {
    canonicalPathname = canonicalPathname.replace(/\/+$/, "");
  }

  if (canonicalize.lowercasePathname) {
    canonicalPathname = canonicalPathname.toLowerCase();
  }

  if (!canonicalPathname.startsWith("/")) {
    canonicalPathname = `/${canonicalPathname}`;
  }

  const resolved = new URL(canonicalPathname, url.origin);
  canonicalPathname = resolved.pathname;

  if (canonicalPathname === rawPathname) {
    return null;
  }

  log({
    level: "info",
    layer: "proxy",
    message: "canonicalize_redirect",
    requestId,
    route: rawPathname,
    status: canonicalize.redirectStatus,
    event: "path_normalization",
    canonicalPathname,
  });

  const redirectUrl = new URL(url.toString());
  redirectUrl.pathname = canonicalPathname;

  return NextResponse.redirect(
    redirectUrl.toString(),
    canonicalize.redirectStatus
  );
}