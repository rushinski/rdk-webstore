// app/api/auth/2fa/challenge/start/route.ts
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ProfileRepository } from "@/repositories/profile-repo";
import type { Factor } from "@supabase/supabase-js";

export async function POST() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const repo = new ProfileRepository(supabase);
  const profile = await repo.getByUserId(user.id);

  if (!profile || profile.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Correct Supabase v2 shape:
  // { all: Factor[], totp: Factor[], phone: Factor[], webauthn: Factor[] }
  const { data: factorsData, error: factorErr } =
    await supabase.auth.mfa.listFactors();

  if (factorErr)
    return NextResponse.json({ error: factorErr.message }, { status: 400 });

  // Correct, typed extraction of TOTP factors
  const totpFactors: Factor[] = factorsData.totp ?? [];

  if (totpFactors.length === 0)
    return NextResponse.json({ error: "No enrolled MFA factors" }, { status: 400 });

  const totp = totpFactors[0];

  const { data: challengeData, error: challengeErr } =
    await supabase.auth.mfa.challenge({
      factorId: totp.id,
    });

  if (challengeErr)
    return NextResponse.json({ error: challengeErr.message }, { status: 400 });

  return NextResponse.json({
    factorId: totp.id,
    challengeId: challengeData.id,
  });
}
