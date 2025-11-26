import { NextResponse, type NextRequest } from "next/server";

import { log } from "@/lib/log";

import { getSessionFromRequest } from "./session";

export async function protectAdminRoute(req: NextRequest, requestId: string) {
  const { pathname } = req.nextUrl;

  const session = await getSessionFromRequest(req, requestId);
  const user = session?.user;

  // No session at all
  if (!user) {
    log({
      level: "warn",
      layer: "auth",
      message: "admin_access_denied_no_session",
      requestId: requestId,
      route: pathname,
      status: 401, // Unauthorized
      event: "admin_guard",
    });

    if (pathname.startsWith("/api")) {
      const res = NextResponse.json(
        { error: "Unauthorized", requestId },
        { status: 401 },
      );
      return res;
    }

    const loginUrl = new URL("/auth/login", req.nextUrl.origin);
    const redirect = NextResponse.redirect(loginUrl, 302);
    return redirect;
  }

  // Wrong role
  if (user.role !== "admin") {
    log({
      level: "warn",
      layer: "auth",
      message: "admin_access_denied_wrong_role",
      requestId: requestId,
      route: pathname,
      status: 403, // Forbidden
      event: "admin_guard",
      userId: user.id,
      role: user.role,
    });

    if (pathname.startsWith("/api")) {
      const res = NextResponse.json({ error: "Forbidden", requestId }, { status: 403 });
      return res;
    }

    const res = NextResponse.redirect("/");
    return res;
  }
  return null; // continue
}
