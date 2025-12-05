// app/api/auth/2fa/challenge/verify/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ProfileRepository } from "@/repositories/profile-repo";

export async function POST(req: NextRequest) {
  const { factorId, challengeId, code } = await req.json();

  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const repo = new ProfileRepository(supabase);
  const profile = await repo.getByUserId(user.id);

  if (!profile || profile.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { error: verifyError } = await supabase.auth.mfa.verify({
    factorId,
    challengeId,
    code,
  });

  if (verifyError)
    return NextResponse.json({ error: verifyError.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}
