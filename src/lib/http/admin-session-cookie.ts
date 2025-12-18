// src/lib/http/admin-session-cookie.ts
import { NextResponse } from "next/server";
import { createAdminSessionToken } from "@/lib/http/admin-session";
import { security } from "@/config/security";

const COOKIE_NAME = security.proxy.adminSession.cookieName;

export async function setAdminSessionCookie<T>(
  res: NextResponse<T>,
  userId: string,
): Promise<NextResponse<T>> {
  const token = await createAdminSessionToken(userId);

  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: security.proxy.adminSession.ttlSeconds,
  });

  return res;
}

export function clearAdminSessionCookie<T>(res: NextResponse<T>): NextResponse<T> {
  res.cookies.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    expires: new Date(0),
    maxAge: 0,
  });

  return res;
}
