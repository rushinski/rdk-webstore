// app/api/auth/otp/verify/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AuthService } from "@/services/auth-service";
import { setAdminSessionCookie } from "@/lib/http/admin-session-cookie";
import type { Factor } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null as any);
  const email = typeof body?.email === "string" ? body.email.trim() : "";
  const code = typeof body?.code === "string" ? body.code.trim() : "";

  if (!email || !code) {
    return NextResponse.json(
      { ok: false, error: "Email and code are required" },
      { status: 400 },
    );
  }

  try {
    const supabase = await createSupabaseServerClient();
    const authService = new AuthService(supabase);

    const { user, profile } = await authService.verifyEmailOtpForSignIn(
      email,
      code,
    );

    if (!user) {
      return NextResponse.json(
        { ok: false, error: "Invalid or expired code" },
        { status: 400 },
      );
    }

    const isAdmin = profile?.role === "admin";

    // For non-admin users, we're done
    if (!isAdmin) {
      return NextResponse.json({ ok: true, isAdmin: false });
    }

    // Admin-specific 2FA checks
    const { data: factorData } = await supabase.auth.mfa.listFactors();
    const totpFactors: Factor[] = factorData?.totp ?? [];

    if (totpFactors.length === 0) {
      return NextResponse.json({
        ok: true,
        isAdmin: true,
        requiresTwoFASetup: true,
      });
    }

    const { data: aalData } =
      await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

    const requiresTwoFAChallenge =
      aalData?.nextLevel === "aal2" && aalData?.currentLevel !== "aal2";

    if (requiresTwoFAChallenge) {
      return NextResponse.json({
        ok: true,
        isAdmin: true,
        requiresTwoFAChallenge: true,
      });
    }

    // Already at aal2, set admin cookie
    let res = NextResponse.json<{ ok: true; isAdmin: true }>({
      ok: true,
      isAdmin: true,
    });

    res = await setAdminSessionCookie(res, user.id);

    return res;
  } catch (error: any) {
    if (error?.message?.includes("Email not confirmed")) {
      return NextResponse.json(
        { ok: false, requiresEmailVerification: true },
        { status: 401 },
      );
    }

    return NextResponse.json(
      { ok: false, error: error.message ?? "Login failed" },
      { status: 400 },
    );
  }
}