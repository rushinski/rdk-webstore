// app/api/auth/confirm/route.ts
import { type NextRequest } from "next/server";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ProfileRepository } from "@/repositories/profile-repo";
import type { EmailOtpType } from "@supabase/supabase-js";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const updatesOptIn = searchParams.get("updatesOptIn") === "true";
  const next = searchParams.get("next");
  const nextPath = next?.startsWith("/") ? next : "/";

  if (!token_hash || !type) {
    redirect(`/auth/error?error=Missing token hash or type`);
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.verifyOtp({
    type,
    token_hash,
  });

  if (error) {
    redirect(`/auth/error?error=${encodeURIComponent(error.message)}`);
  }

  const user = data.user;
  if (!user) {
    redirect(`/auth/error?error=User not found`);
  }

  const repo = new ProfileRepository(supabase);
  await repo.ensureProfile(user.id, user.email!, updatesOptIn);

  redirect(nextPath);
}
