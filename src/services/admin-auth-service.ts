import type { TypedSupabaseClient } from "@/lib/supabase/server";
import { ProfileRepository } from "@/repositories/profile-repo";
import type { Factor } from "@supabase/supabase-js";

export class AdminAuthService {
  private profileRepo: ProfileRepository;

  constructor(private readonly supabase: TypedSupabaseClient) {
    this.profileRepo = new ProfileRepository(supabase);
  }

  async requireAdminUser(): Promise<{ userId: string }> {
    const {
      data: { user },
      error,
    } = await this.supabase.auth.getUser();

    if (error) {
      const err = new Error("AUTH_ERROR");
      (err as any).code = "AUTH_ERROR";
      throw err;
    }

    if (!user) {
      const err = new Error("UNAUTHORIZED");
      (err as any).code = "UNAUTHORIZED";
      throw err;
    }

    const profile = await this.profileRepo.getByUserId(user.id);
    if (!profile || profile.role !== "admin") {
      const err = new Error("FORBIDDEN");
      (err as any).code = "FORBIDDEN";
      throw err;
    }

    return { userId: user.id };
  }

  async getMfaRequirements(): Promise<{
    requiresTwoFASetup: boolean;
    requiresTwoFAChallenge: boolean;
  }> {
    const { data: factorData } = await this.supabase.auth.mfa.listFactors();
    const totpFactors: Factor[] = factorData?.totp ?? [];

    if (totpFactors.length === 0) {
      return { requiresTwoFASetup: true, requiresTwoFAChallenge: false };
    }

    const { data: aalData } =
      await this.supabase.auth.mfa.getAuthenticatorAssuranceLevel();

    const requiresTwoFAChallenge =
      aalData?.nextLevel === "aal2" && aalData?.currentLevel !== "aal2";

    return { requiresTwoFASetup: false, requiresTwoFAChallenge };
  }

  async listTotpFactors(): Promise<Factor[]> {
    const { data: factorsData, error } = await this.supabase.auth.mfa.listFactors();
    if (error) throw error;
    return factorsData?.totp ?? [];
  }

  async enrollTotp() {
    return this.supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: "Admin TOTP",
      issuer: "RealDealKickz",
    });
  }

  async startChallenge(factorId: string) {
    return this.supabase.auth.mfa.challenge({ factorId });
  }

  async verifyChallenge(factorId: string, challengeId: string, code: string) {
    return this.supabase.auth.mfa.verify({ factorId, challengeId, code });
  }
}
