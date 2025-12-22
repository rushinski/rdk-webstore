// app/api/auth/2fa/verify-enrollment/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ProfileRepository } from "@/repositories/profile-repo";
import { setAdminSessionCookie } from "@/lib/http/admin-session-cookie";

export async function POST(req: NextRequest) {
  const { code, factorId } = await req.json();

  if (!code || !factorId) {
    return NextResponse.json(
      { error: "Missing code or factorId" },
      { status: 400 }
    );
  }

  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    console.error("supabase.auth.getUser error", userError);
    return NextResponse.json({ error: "Auth error" }, { status: 500 });
  }

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const repo = new ProfileRepository(supabase);
  const profile = await repo.getByUserId(user.id);

  if (!profile || profile.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Create challenge
  const { data: challengeData, error: challengeError } =
    await supabase.auth.mfa.challenge({
      factorId,
    });

  if (challengeError || !challengeData) {
    console.error("mfa.challenge error", challengeError);
    return NextResponse.json(
      { error: challengeError?.message ?? "Failed to create challenge" },
      { status: 400 }
    );
  }

  const challengeId = challengeData.id;

  // Verify the TOTP code
  const { error: verifyError } = await supabase.auth.mfa.verify({
    factorId,
    challengeId,
    code,
  });

  if (verifyError) {
    console.error("mfa.verify error", verifyError);
    return NextResponse.json(
      { error: verifyError.message ?? "Invalid code" },
      { status: 400 }
    );
  }

  // Success! Set admin session cookie and return
  let res = NextResponse.json<{ ok: true }>({ ok: true });
  res = await setAdminSessionCookie(res, user.id);

  return res;
}