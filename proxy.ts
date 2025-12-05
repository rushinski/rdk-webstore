// proxy.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { applyRateLimit } from "@/proxy/rate-limit";
import { protectAdminRoute } from "@/proxy/auth";
import { checkCsrf } from "@/proxy/csrf";
import { checkBot } from "@/proxy/bot";
import { canonicalizePath } from "@/proxy/canonicalize";
import { finalizeProxyResponse } from "@/proxy/finalize";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const { crypto } = globalThis;

// Proxy will only return a url if we are redirecting, otherwise we attach headers to the response and decide if the request is allowed
export async function proxy(request: NextRequest) {
  // Generates a ID to recognize requests across layers within logs 
  const requestId = `$req-${crypto.randomUUID()}`;

  // Stores what canonicalizePath will return. Either null or a object (NextResponse)
  const canon = canonicalizePath(request, requestId);
  // If we returned a object this if statement runs. We return finalizeProxyResponse which sets req-id and security headers
  // Once returned : redirect occurs -> program ends -> redirect = new request - meaning proxy activates again
  if (canon) {
    return finalizeProxyResponse(canon, requestId);
  }

  // nextUrl is a Next.js-generated URL object built from the incoming HTTP request
  const { pathname } = request.nextUrl; // Gets the pathname. Raw = request.nextUrl.pathname

   // Create base response & apply security + request-id
  let response = NextResponse.next();
  response = finalizeProxyResponse(response, requestId);

  // If our pathname starts with one of these we will hit the if statement below. Otherwise it will be null and skipped
  const shouldBotCheck =
    pathname.startsWith("/admin") ||
    pathname === "/api" ||
    pathname.startsWith("/auth") ||
    pathname === "/products";

  if (shouldBotCheck) {
    const botResult = checkBot(request, requestId);
    if (botResult) {
      return finalizeProxyResponse(botResult, requestId);
    }
  }

  // CSRF (unsafe HTTP methods)
  const csrfResult = checkCsrf(request, requestId);
  if (csrfResult) {
    return finalizeProxyResponse(csrfResult, requestId);
  }

  // Rate limit (api, admin, auth, checkout)
  const shouldRateLimit =
    pathname.startsWith("/api") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/checkout");

  if (shouldRateLimit) {
    const rateLimitResult = await applyRateLimit(request, requestId);
    if (rateLimitResult) {
      return finalizeProxyResponse(rateLimitResult, requestId);
    }
  }

  // Admin guard
  if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
    const supabase = await createSupabaseServerClient();
    const adminRes = await protectAdminRoute(request, requestId, supabase);
    if (adminRes) return finalizeProxyResponse(adminRes, requestId);
  }

  return response;
}

// This is what our proxy ignores
export const config = { 
  matcher: [
    "/((?!_next|static|favicon.ico|robots.txt|sitemap.xml).*)"
  ],
};
