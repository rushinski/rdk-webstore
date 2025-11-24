// src/proxy/auth.ts
import { NextResponse, type NextRequest } from "next/server";
import { getSessionFromRequest } from "./session";
import { log } from "@/lib/log";

export async function protectAdminRoute(req: NextRequest, requestId: string) {
  const { pathname } = req.nextUrl;

  const session = await getSessionFromRequest(req, requestId);
  const user = session?.user;

  // No session at all
  if (!user) {
    log("warn", "admin_access_denied_no_session", {
      layer: "proxy",
      requestId,
      route: pathname,
      event: "admin_guard",
    });

    if (pathname.startsWith("/api")) {
      const res = NextResponse.json(
        { error: "Unauthorized", requestId },
        { status: 401 }
      );
      res.headers.set("x-request-id", requestId);
      return res;
    }

    const loginUrl = new URL("/auth/login", req.nextUrl.origin);

    const redirect = NextResponse.redirect(loginUrl, 302);
    redirect.headers.set("x-request-id", requestId);

    return redirect;
  }

  // Wrong role
  if (user.role !== "admin") {
    log("warn", "admin_access_denied_wrong_role", {
      layer: "proxy",
      requestId,
      route: pathname,
      userId: user.id,
      role: user.role,
      event: "admin_guard",
    });

    if (pathname.startsWith("/api")) {
      const res = NextResponse.json(
        { error: "Forbidden", requestId },
        { status: 403 }
      );
      res.headers.set("x-request-id", requestId);
      return res;
    }

    const res = NextResponse.redirect("/");
    res.headers.set("x-request-id", requestId);
    return res;
  }

  // No 2FA
  if (!user.twoFactorEnabled) {
    log("warn", "admin_no_2fa", {
      layer: "proxy",
      requestId,
      route: pathname,
      userId: user.id,
      event: "admin_guard",
    });
  }

  return null; // continue
}
