// proxy.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { security, startsWithAny, isCsrfUnsafeMethod } from "@/config/security";
import { createSupabaseProxyClient } from "@/lib/supabase/proxy";
import { refreshSession } from "@/lib/supabase/session-refresh";
import { generateRequestId } from "@/lib/http/request-id";
import { protectAdminRoute } from "@/proxy/auth";
import { checkCsrf } from "@/proxy/csrf";
import { canonicalizePath } from "@/proxy/canonicalize";
import { finalizeProxyResponse } from "@/proxy/finalize";

/**
 * @see docs/PROXY_PIPELINE.md
 */
export async function proxy(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const { pathname, hostname } = request.nextUrl;
  const canonicalizeResponse = canonicalizePath(request, requestId);

  if (canonicalizeResponse) {
    return finalizeProxyResponse(canonicalizeResponse, requestId);
  }

  // Refresh Supabase session and get response with cookies
  const sessionResponse = await refreshSession(request);

  // Create forwarded headers with request ID for downstream handlers
  const forwardedHeaders = new Headers(request.headers);
  forwardedHeaders.set(security.proxy.requestIdHeader, requestId);

  // Create new response with forwarded headers
  let response = NextResponse.next({
    request: { headers: forwardedHeaders },
  });

  // Copy all Supabase session cookies to the new response
  sessionResponse.cookies.getAll().forEach((cookie) => {
    response.cookies.set(cookie.name, cookie.value, cookie);
  });

  response = finalizeProxyResponse(response, requestId);

  if (isCsrfUnsafeMethod(request.method)) {
    const csrfResponse = checkCsrf(request, requestId);

    if (csrfResponse) {
      return finalizeProxyResponse(csrfResponse, requestId);
    }
  }

  const isAdminArea = startsWithAny(
    pathname,
    security.proxy.adminGuard.protectedPrefixes,
  );

  const isExemptRoute = startsWithAny(pathname, security.proxy.adminGuard.exemptPrefixes);

  if (isAdminArea && !isExemptRoute) {
    const supabase = createSupabaseProxyClient(request);

    const adminResponse = await protectAdminRoute(request, requestId, supabase);

    if (adminResponse) {
      return finalizeProxyResponse(adminResponse, requestId);
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next|static|favicon.ico|robots.txt|sitemap.xml).*)"],
};
