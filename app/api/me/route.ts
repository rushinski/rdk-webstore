import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ProfileRepository } from "@/repositories/profile-repo";

export async function GET(_req: NextRequest) {
  const supabase = await createSupabaseServerClient(); // FIX

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ user: null, profile: null });

  const repo = new ProfileRepository(supabase);
  const profile = await repo.getByUserId(user.id);

  return NextResponse.json({ user, profile });
}

