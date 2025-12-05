// app/api/auth/2fa/enroll/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ProfileRepository } from "@/repositories/profile-repo";

export async function POST(req: NextRequest) {
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

  // Optional: admin-only MFA (like your old flow)
  const repo = new ProfileRepository(supabase);
  const profile = await repo.getByUserId(user.id);

  if (!profile || profile.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Start MFA enrollment (TOTP) via Supabase
  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: "totp",
    friendlyName: "Admin TOTP",
    issuer: "RealDealKickz",
  });

  if (error || !data) {
    console.error("mfa.enroll error", error);
    return NextResponse.json(
      { error: error?.message ?? "Failed to start MFA enrollment" },
      { status: 400 }
    );
  }

  const { id: factorId, totp } = data;

  // totp.qr_code is an SVG data URL, totp.uri is the otpauth URL
  return NextResponse.json({
    factorId,
    qrCode: totp.qr_code,
    uri: totp.uri,
  });
}
