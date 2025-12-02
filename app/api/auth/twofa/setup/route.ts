import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { TwoFAService } from "@/services/twofa-service";
import { ProfileRepository } from "@/repositories/profile-repo";

export async function POST(_req: NextRequest) {
  const supabase = await createSupabaseServerClient(); // FIX
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const repo = new ProfileRepository(supabase);
  const profile = await repo.getByUserId(user.id);

  if (!profile || profile.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { secret } = await TwoFAService.ensureAdminHasSecret(user.id);

  return NextResponse.json({ secret });
}

