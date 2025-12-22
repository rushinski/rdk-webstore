// app/api/auth/login/route.ts
import { NextRequest, NextResponse } from "next/server";
import { AuthService } from "@/services/auth-service";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { setAdminSessionCookie } from "@/lib/http/admin-session-cookie";
import type { Factor } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();

  try {
    const supabase = await createSupabaseServerClient();
    const authService = new AuthService(supabase);

    const { user, profile } = await authService.signIn(email, password);

    if (!user) {
      return NextResponse.json(
        { ok: false, error: "Invalid credentials" },
        { status: 401 }
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

    // If no TOTP enrolled, redirect to setup
    if (totpFactors.length === 0) {
      return NextResponse.json({
        ok: true,
        isAdmin: true,
        requiresTwoFASetup: true,
      });
    }

    // Check if they need to do 2FA challenge
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

    // If they're already at aal2, set admin cookie and let them through
    let res = NextResponse.json<{ ok: true; isAdmin: true }>({
      ok: true,
      isAdmin: true,
    });

    res = await setAdminSessionCookie(res, user.id);

    return res;
  } catch (error: any) {
    if (error?.message?.includes("Email not confirmed")) {
      try {
        const supabase = await createSupabaseServerClient();
        const authService = new AuthService(supabase);
        await authService.resendVerification(email, "signin");
      } catch {
        // swallow resend errors
      }

      return NextResponse.json(
        { ok: false, requiresEmailVerification: true },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { ok: false, error: error.message ?? "Login failed" },
      { status: 400 }
    );
  }
}