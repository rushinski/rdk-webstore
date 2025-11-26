import { jwtVerify } from "jose";
import type { NextRequest } from "next/server";

import { env } from "@/config/env";
import { log } from "@/lib/log";

export type SessionUser = {
  id: string;
  role: string;
  email?: string;
  twoFactorEnabled?: boolean;
};

export type Session = {
  user: SessionUser | null;
};

async function verifyJwt(token: string): Promise<any | null> {
  try {
    const secret = new TextEncoder().encode(env.SUPABASE_JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    return payload;
  } catch {
    return null;
  }
}

export async function getSessionFromRequest(
  req: NextRequest,
  requestId?: string,
): Promise<Session> {
  const accessToken = req.cookies.get("sb-access-token")?.value;

  if (!accessToken) {
    log({
      level: "warn",
      layer: "auth",
      message: "session_missing_token",
      requestId: requestId,
      route: req.nextUrl.pathname,
      event: "session_parse",
    });
    return { user: null };
  }

  const payload = await verifyJwt(accessToken);
  if (!payload) {
    log({
      level: "warn",
      layer: "auth",
      message: "session_invalid_jwt",
      requestId: requestId,
      route: req.nextUrl.pathname,
      event: "session_parse",
    });
    return { user: null };
  }

  const userId = payload.sub ?? payload.user_id;
  if (!userId) {
    log({
      level: "warn",
      layer: "auth",
      message: "session_missing_user_id",
      requestId: requestId,
      route: req.nextUrl.pathname,
      event: "session_parse",
    });
    return { user: null };
  }

  const role =
    typeof payload.role === "string"
      ? payload.role
      : (payload.user_metadata?.role ?? "customer");

  const email =
    typeof payload.email === "string" ? payload.email : payload.user_metadata?.email;

  const twofa = payload.user_metadata?.twofa_enabled ?? payload.twofa_enabled ?? false;

  return {
    user: {
      id: String(userId),
      role: String(role),
      email: email ? String(email) : undefined,
      twoFactorEnabled: !!twofa,
    },
  };
}
