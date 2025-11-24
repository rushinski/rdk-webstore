import { NextResponse, type NextRequest } from "next/server";
import { applySecurityHeaders } from "@/proxy/security-headers";
import { applyRateLimit } from "@/proxy/rate-limit";
import { protectAdminRoute } from "@/proxy/auth";
import { createRequestId } from "@/proxy/request-id";
import { checkCsrf } from "@/proxy/csrf";
import { checkBot } from "@/proxy/bot";
import { canonicalizePath } from "@/proxy/canonicalize";

export async function proxy(request: NextRequest) {
  const requestId = createRequestId(); // Calls the function from request-ids to create a id and store it to use across all proxy process

  // 1. Canonicalize path
  const canon = canonicalizePath(request, requestId);
  if (canon) return canon;

  const { pathname } = request.nextUrl;

  // 2. Base response
  const response = NextResponse.next();
  response.headers.set("x-request-id", requestId);

  // 3. Security headers
  applySecurityHeaders(response);

  // 4. Bot check
  const shouldBotCheck =
    pathname.startsWith("/auth") ||
    pathname === "/login" ||
    pathname.startsWith("/checkout");

  if (shouldBotCheck) {
    const botResult = checkBot(request, requestId);
    if (botResult) return botResult;
  }

  // 5. CSRF (unsafe methods only)
  const csrfResult = checkCsrf(request, requestId);
  if (csrfResult) return csrfResult;

  // 6. Rate limit
  const shouldRateLimit =
    pathname.startsWith("/api") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/checkout");

  if (shouldRateLimit) {
    const rateLimitResult = await applyRateLimit(request, requestId);
    if (rateLimitResult) return rateLimitResult;
  }

  // 7. Admin guard
  if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
    const adminGuardResult = await protectAdminRoute(request, requestId);
    if (adminGuardResult) return adminGuardResult;
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next|static|favicon.ico|robots.txt|sitemap.xml).*)",],
};
