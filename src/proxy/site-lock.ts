// src/proxy/site-lock.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { security, startsWithAny } from "@/config/security";
import { verifyAdminSessionToken } from "@/lib/http/admin-session";

const SITE_UNLOCKS_AT_ISO: string | null = "2026-02-05T20:00:00-05:00";

function parseUnlockAt(iso: string): Date | null {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

function isApiPath(pathname: string) {
  return pathname.startsWith("/api");
}

async function awaitMaybeVerify(token: string) {
  try {
    return await verifyAdminSessionToken(token);
  } catch {
    return null;
  }
}

export async function checkSiteLock(
  request: NextRequest,
  requestId: string,
): Promise<NextResponse | null> {
  const { pathname, search } = request.nextUrl;

  if (!SITE_UNLOCKS_AT_ISO) return null;

  const unlockAt = parseUnlockAt(SITE_UNLOCKS_AT_ISO);
  if (!unlockAt) return null;

  const now = new Date();
  if (now.getTime() >= unlockAt.getTime()) return null;

  const allowPrefixes = [
    "/locked",
    "/auth",
    "/api/auth",
    "/admin",
    "/api/admin",
    "/images",
  ];

  if (startsWithAny(pathname, allowPrefixes)) return null;

  // Admin bypass (valid admin session cookie)
  const adminCookieValue = request.cookies.get(security.proxy.adminSession.cookieName)?.value;
  if (adminCookieValue) {
    const session = await awaitMaybeVerify(adminCookieValue);
    if (session) return null;
  }

  if (isApiPath(pathname)) {
    return NextResponse.json(
      {
        ok: false,
        error: "Site is locked",
        unlocksAt: unlockAt.toISOString(),
        requestId,
      },
      { status: 423, headers: { "Cache-Control": "no-store" } },
    );
  }

  const accept = request.headers.get("accept") || "";
  const isHtmlNav = accept.includes("text/html");

  // If it's not an HTML navigation, don't lock it (assets, images, many fetches)
  if (!isHtmlNav) return null;

  const lockedUrl = request.nextUrl.clone();
  lockedUrl.pathname = "/locked";
  lockedUrl.search = `?next=${encodeURIComponent(pathname + (search || ""))}`;

  const res = NextResponse.redirect(lockedUrl);
  res.headers.set("Cache-Control", "no-store");
  return res;
}
