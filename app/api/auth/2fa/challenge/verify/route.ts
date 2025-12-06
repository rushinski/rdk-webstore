// app/api/auth/2fa/challenge/verify/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ProfileRepository } from "@/repositories/profile-repo";
import { AdminSessionService } from "@/services/admin-session-service";

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

  let res = NextResponse.json<{ ok: true; isAdmin: true }>({
    ok: true,
    isAdmin: true,
  });

  res = await AdminSessionService.attachAdminSessionCookie(res, user.id);

  return res;
}
