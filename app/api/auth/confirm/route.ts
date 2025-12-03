// app/api/auth/confirm/route.ts
import { type NextRequest } from "next/server";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { ProfileRepository } from "@/repositories/profile-repo";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next");
  const nextPath = next?.startsWith("/") ? next : "/";

  if (token_hash && type) {
    const supabase = await createSupabaseServerClient(); // FIX
    const { data, error } = await supabase.auth.verifyOtp({ type, token_hash });

    if (!error) {
      const user = data.user;

      if (user) {
        const repo = new ProfileRepository(supabase);

        // Ensure profile exists (idempotent)
        await repo.ensureProfile(user.id, user.email!);
      }

      redirect(nextPath);
    }

    redirect(`/auth/error?error=${encodeURIComponent(error.message)}`);
  }

  redirect(`/auth/error?error=${encodeURIComponent("No token hash or type")}`);
}
