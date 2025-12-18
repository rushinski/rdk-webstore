// src/proxy/proxy.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { security, startsWithAny, isCsrfUnsafeMethod } from "@/config/security";

import { applyRateLimit } from "@/proxy/rate-limit";
import { protectAdminRoute } from "@/proxy/auth";
import { checkCsrf } from "@/proxy/csrf";
import { checkBot } from "@/proxy/bot";
import { canonicalizePath } from "@/proxy/canonicalize";
import { finalizeProxyResponse } from "@/proxy/finalize";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const { crypto } = globalThis;

export async function proxy(request: NextRequest) {
  const requestId = `req_${crypto.randomUUID()}`;
  const { pathname } = request.nextUrl;

  // 1) Canonical redirects happen before any other checks.
  const canonRes = canonicalizePath(request, requestId);
  if (canonRes) {
    return finalizeProxyResponse(canonRes, requestId);
  }

  // 2) Forward x-request-id into the downstream request so route handlers/services
  // can reuse it for structured logs and correlation.
  const forwardedHeaders = new Headers(request.headers);
  forwardedHeaders.set(security.proxy.requestIdHeader, requestId);

  // Base pass-through response
  let res = NextResponse.next({ request: { headers: forwardedHeaders } });
  res = finalizeProxyResponse(res, requestId);

  // 3) Bot check (subset of routes)
  if (startsWithAny(pathname, security.proxy.botCheckPrefixes)) {
    const botRes = checkBot(request, requestId);
    if (botRes) return finalizeProxyResponse(botRes, requestId);
  }

  // 4) CSRF check (unsafe methods only)
  if (isCsrfUnsafeMethod(request.method)) {
    const csrfRes = checkCsrf(request, requestId);
    if (csrfRes) return finalizeProxyResponse(csrfRes, requestId);
  }

  // 5) Rate limit (subset of routes; aligns with MVP requirements)
  if (startsWithAny(pathname, security.proxy.rateLimitPrefixes)) {
    const rateLimitRes = await applyRateLimit(request, requestId);
    if (rateLimitRes) return finalizeProxyResponse(rateLimitRes, requestId);
  }

  // 6) Admin guard (admin pages + admin APIs, with explicit exemption)
  const isAdminArea = startsWithAny(pathname, security.proxy.adminGuard.protectedPrefixes);
  const isExempt = startsWithAny(pathname, security.proxy.adminGuard.exemptPrefixes);

  if (isAdminArea && !isExempt) {
    const supabase = await createSupabaseServerClient();
    const adminRes = await protectAdminRoute(request, requestId, supabase);
    if (adminRes) return finalizeProxyResponse(adminRes, requestId);
  }

  return res;
}

export const config = {
  matcher: ["/((?!_next|static|favicon.ico|robots.txt|sitemap.xml).*)"],
};
