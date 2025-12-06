// src/services/admin-session-service.ts
import { NextResponse } from "next/server";
import { createAdminSessionToken } from "@/lib/crypto/admin-session";

/**
 * Small helper service to attach / clear the admin_session cookie on responses.
 * This keeps cookie details out of route handlers and matches the service-layer pattern.
 */
export class AdminSessionService {
  /**
   * Attach a new admin_session cookie to the provided NextResponse.
   * Call this ONLY after:
   *  - user is authenticated
   *  - user is confirmed to be an admin
   *  - (and for admins) 2FA has been successfully completed
   */
  static async attachAdminSessionCookie<T>(
    res: NextResponse<T>,
    userId?: string
  ): Promise<NextResponse<T>> {
    const token = await createAdminSessionToken(userId);

    res.cookies.set("admin_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
    });

    return res;
  }

  /**
   * Clear the admin_session cookie from the response (on logout or downgrade).
   */
  static clearAdminSessionCookie<T>(res: NextResponse<T>): NextResponse<T> {
    res.cookies.set("admin_session", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 0
    });

    return res;
  }
}
