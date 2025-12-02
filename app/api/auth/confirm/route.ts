// app/api/auth/confirm/route.ts
import { type NextRequest } from "next/server";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { EmailOtpType } from "@supabase/supabase-js";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next");
  const nextPath = next?.startsWith("/") ? next : "/";

  if (token_hash && type) {
    const supabase = await createSupabaseServerClient(); // FIX
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });

    if (!error) redirect(nextPath);
    redirect(`/auth/error?error=${encodeURIComponent(error.message)}`);
  }

  redirect(`/auth/error?error=${encodeURIComponent("No token hash or type")}`);
}
