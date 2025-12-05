// app/api/auth/login/route.ts
import { NextRequest, NextResponse } from "next/server";
import { AuthService } from "@/services/auth-service";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Factor } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  const { email, password, staySignedIn } = await req.json();

  try {
    // 1) Create Supabase client for this request
    const supabase = await createSupabaseServerClient(staySignedIn);

    // 2) Pass it into the AuthService
    const authService = new AuthService(supabase);

    // 3) Sign the user in (correct RLS + cookie session)
    const { user, profile } = await authService.signIn(email, password);

    if (!user) {
      return NextResponse.json(
        { ok: false, error: "Invalid credentials" },
        { status: 401 }
      );
    }

    const isAdmin = profile?.role === "admin";

    // 1) Correct: listFactors() shape is { totp: Factor[], all: Factor[], ... }
    const { data: factorData } = await supabase.auth.mfa.listFactors();

    // No need to filter — factorData.totp already contains ONLY totp factors
    const totpFactors: Factor[] = factorData?.totp ?? [];

    // 2) Fetch AAL (Authenticator Assurance Level)
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
