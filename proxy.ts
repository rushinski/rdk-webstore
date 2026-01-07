// proxy.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { security, startsWithAny, isCsrfUnsafeMethod } from "@/config/security";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import { applyRateLimit } from "@/proxy/rate-limit";
import { protectAdminRoute } from "@/proxy/auth";
import { checkCsrf } from "@/proxy/csrf";
import { checkBot } from "@/proxy/bot";
import { canonicalizePath } from "@/proxy/canonicalize";
import { finalizeProxyResponse } from "@/proxy/finalize";

/**
 * @see docs/PROXY_PIPELINE.md
 */
export async function proxy(request: NextRequest): Promise<NextResponse> {
  const requestId = `req_${globalThis.crypto.randomUUID()}`;
  const { pathname, hostname } = request.nextUrl;
  const isLocalhost =
    hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
  const isLocalDev = isLocalhost;

  const canonicalizeResponse = canonicalizePath(request, requestId);

  if (canonicalizeResponse) {
    return finalizeProxyResponse(canonicalizeResponse, requestId);
  }

  const forwardedHeaders = new Headers(request.headers);
  forwardedHeaders.set(security.proxy.requestIdHeader, requestId);

  let response = NextResponse.next({
    request: { headers: forwardedHeaders },
  });

  response = finalizeProxyResponse(response, requestId);

  if (!isLocalDev && startsWithAny(pathname, security.proxy.botCheckPrefixes)) {
    const botResponse = checkBot(request, requestId);

    if (botResponse) {
      // Bot detected - return block response
      return finalizeProxyResponse(botResponse, requestId);
    }
  }

  if (isCsrfUnsafeMethod(request.method)) {
    const csrfResponse = checkCsrf(request, requestId);

    if (csrfResponse) {
      // CSRF attack detected - return block response
      return finalizeProxyResponse(csrfResponse, requestId);
    }
  }

  if (!isLocalDev && startsWithAny(pathname, security.proxy.rateLimitPrefixes)) {
    const rateLimitResponse = await applyRateLimit(request, requestId);

    if (rateLimitResponse) {
      // Rate limit exceeded - return block response
      return finalizeProxyResponse(rateLimitResponse, requestId);
    }
  }

  const isAdminArea = startsWithAny(
    pathname,
    security.proxy.adminGuard.protectedPrefixes
  );

  const isExemptRoute = startsWithAny(
    pathname,
    security.proxy.adminGuard.exemptPrefixes
  );

  if (isAdminArea && !isExemptRoute) {
    const supabase = await createSupabaseServerClient();

    const adminResponse = await protectAdminRoute(request, requestId, supabase);

    if (adminResponse) {
      return finalizeProxyResponse(adminResponse, requestId);
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next|static|favicon.ico|robots.txt|sitemap.xml).*)",
  ],
};
