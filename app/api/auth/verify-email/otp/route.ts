// app/api/auth/verify-email/otp/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ProfileRepository } from "@/repositories/profile-repo";

type Flow = "signup" | "signin";

export async function POST(req: NextRequest) {
  const { email, code, flow }: { email?: string; code?: string; flow?: Flow } =
    await req.json();

  if (!email || !code) {
    return NextResponse.json(
      { ok: false, error: "Email and code are required." },
      { status: 400 },
    );
  }

  try {
    const supabase = await createSupabaseServerClient();

    // Uses the same OTP "signup" type you're already using for email confirmation
    const { data, error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: code.trim(),
      type: "signup",
    });

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message ?? "Could not verify code." },
        { status: 400 },
      );
    }

    const user = data.user;
    if (!user || !user.email) {
      return NextResponse.json(
        { ok: false, error: "User not found after verification." },
        { status: 400 },
      );
    }

    // Optional: pull updatesOptIn from metadata to keep ensureProfile behavior
    const updatesOptInMeta = (user.user_metadata as any)?.updatesOptIn;
    const updatesOptIn =
      updatesOptInMeta === "true" || updatesOptInMeta === true;

    const repo = new ProfileRepository(supabase);
    await repo.ensureProfile(user.id, user.email, updatesOptIn);

    // Basic landing behavior – you can adjust
    const nextPath = flow === "signin" ? "/" : "/";

    return NextResponse.json({ ok: true, nextPath });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message ?? "Could not verify code." },
      { status: 400 },
    );
  }
}
