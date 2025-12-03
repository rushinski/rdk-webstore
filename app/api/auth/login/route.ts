import { NextRequest, NextResponse } from "next/server";
import { AuthService } from "@/services/auth-service";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Factor } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();

  try {
    const { user, profile } = await AuthService.signIn(email, password);

    if (!user) {
      return NextResponse.json(
        { ok: false, error: "Invalid credentials" },
        { status: 401 }
      );
    }

    const isAdmin = profile?.role === "admin";

    const supabase = await createSupabaseServerClient();

    // 1) Correct: listFactors() shape is { totp: Factor[], all: Factor[], ... }
    const { data: factorData } = await supabase.auth.mfa.listFactors();

    // 🔥 No need to filter — factorData.totp already contains ONLY totp factors
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
    return NextResponse.json(
      { ok: false, error: error.message ?? "Login failed" },
      { status: 400 }
    );
  }
}
