// app/api/auth/forgot-password/verify-code/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AuthService } from "@/services/auth-service";
import { ProfileRepository } from "@/repositories/profile-repo";
import type { Factor } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null as any);
    const email = typeof body?.email === "string" ? body.email.trim() : "";
    const code = typeof body?.code === "string" ? body.code.trim() : "";

    if (!email || !code) {
      return NextResponse.json(
        { ok: false, error: "Email and code are required" },
        { status: 400 },
      );
    }

    const supabase = await createSupabaseServerClient();
    const authService = new AuthService(supabase);

    // This establishes a recovery session
    await authService.verifyPasswordResetCode(email, code);

    // Now check if user is admin and needs 2FA
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { ok: false, error: "Session error" },
        { status: 400 },
      );
    }

    const repo = new ProfileRepository(supabase);
    const profile = await repo.getByUserId(user.id);
    const isAdmin = profile?.role === "admin";

    // If admin, check 2FA status
    if (isAdmin) {
      const { data: factorData } = await supabase.auth.mfa.listFactors();
      const totpFactors: Factor[] = factorData?.totp ?? [];

      if (totpFactors.length === 0) {
        // Admin has no 2FA setup - require setup
        return NextResponse.json({
          ok: true,
          requiresTwoFASetup: true,
        });
      }

      // Check AAL level
      const { data: aalData } =
        await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

      const requiresTwoFAChallenge =
        aalData?.nextLevel === "aal2" && aalData?.currentLevel !== "aal2";

      if (requiresTwoFAChallenge) {
        return NextResponse.json({
          ok: true,
          requiresTwoFAChallenge: true,
        });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: error?.message ?? "Invalid or expired code",
      },
      { status: 400 },
    );
  }
}