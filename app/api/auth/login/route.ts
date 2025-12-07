// app/api/auth/login/route.ts
import { NextRequest, NextResponse } from "next/server";
import { AuthService } from "@/services/auth-service";
import { createSupabaseServerClient } from "@/lib/supabase/server";
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

    const { data: factorData } = await supabase.auth.mfa.listFactors();
    const totpFactors: Factor[] = factorData?.totp ?? [];

    const { data: aalData } =
      await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

    const requiresTwoFASetup = isAdmin && totpFactors.length === 0;

    const requiresTwoFAChallenge =
      isAdmin &&
      aalData?.nextLevel === "aal2" &&
      aalData?.currentLevel !== "aal2";

    return NextResponse.json({
      ok: true,
      isAdmin,
      requiresTwoFASetup,
      requiresTwoFAChallenge,
    });
  } catch (error: any) {
    if (error?.message?.includes("Email not confirmed")) {
      // Automatically resend verification email on failed login
      try {
        const supabase = await createSupabaseServerClient();
        const authService = new AuthService(supabase);
        await authService.resendVerification(email, "signin");
      } catch {
        // swallow resend errors to avoid leaking details
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
