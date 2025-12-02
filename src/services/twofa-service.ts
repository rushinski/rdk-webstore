import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ProfileRepository } from "@/repositories/profile-repo";
// import { authenticator } from "otplib"; // when ready

export class TwoFAService {
  static async ensureAdminHasSecret(userId: string) {
  const supabase = await createSupabaseServerClient(); // FIX
  const repo = new ProfileRepository(supabase);

  const profile = await repo.getByUserId(userId);
  if (!profile) throw new Error("Profile not found");

  if (!profile.totp_secret) {
    const fakeSecret = "REPLACE_ME_WITH_REAL_TOTP_SECRET";
    await repo.setTwoFASecret(userId, fakeSecret);
    return { profile, secret: fakeSecret };
  }

  return { profile, secret: profile.totp_secret };
}

  static async verifyCode(userId: string, code: string) {
    const supabase = await createSupabaseServerClient(); // FIX
    const repo = new ProfileRepository(supabase);

    const profile = await repo.getByUserId(userId);
    if (!profile || !profile.totp_secret) throw new Error("2FA not initialized");

    const isValid = code === "000000"; // TEMP stub

    if (!isValid) return false;

    await repo.markTwoFAEnabled(userId);
    return true;
  }
}
