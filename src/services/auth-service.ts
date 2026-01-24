import type { TypedSupabaseClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/service-role";
import { ProfileRepository } from "@/repositories/profile-repo";
import { EmailSubscriberRepository } from "@/repositories/email-subscriber-repo";

export type VerificationFlow = "signup" | "signin";

interface UserMetadata {
  updatesOptIn?: boolean | string;
}

export class AuthService {
  constructor(private readonly supabase: TypedSupabaseClient) {}

  async signUp(email: string, password: string, updatesOptIn: boolean) {
    const { error } = await this.supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          updatesOptIn,
        },
      },
    });

    if (error) {
      throw error;
    }
  }

  async signIn(email: string, password: string) {
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw error;
    }
    if (!data.user) {
      return { user: null, profile: null };
    }

    const repo = new ProfileRepository(this.supabase);
    const profile = await repo.getByUserId(data.user.id);

    return { user: data.user, profile };
  }

  async signOut() {
    const { error } = await this.supabase.auth.signOut();
    if (error) {
      throw error;
    }
  }

  async sendPasswordReset(email: string) {
    const { error } = await this.supabase.auth.resetPasswordForEmail(email);
    if (error) {
      throw error;
    }
  }

  async verifyPasswordResetCode(email: string, code: string) {
    const { data, error } = await this.supabase.auth.verifyOtp({
      email,
      token: code,
      type: "recovery",
    });

    if (error) {
      throw error;
    }
    return data;
  }

  async updatePassword(newPassword: string) {
    const { error } = await this.supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      throw error;
    }
  }

  async resendVerification(email: string, _flow: VerificationFlow = "signup") {
    const { error } = await this.supabase.auth.resend({
      type: "signup",
      email,
    });

    if (error) {
      throw error;
    }
  }

  async requestEmailOtpForSignIn(email: string) {
    const { error } = await this.supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false },
    });

    if (error && !error.message.toLowerCase().includes("user not found")) {
      throw error;
    }
  }

  async verifyEmailOtpForSignIn(email: string, code: string) {
    const { data, error } = await this.supabase.auth.verifyOtp({
      email,
      token: code,
      type: "email",
    });

    if (error) {
      throw error;
    }
    if (!data.user) {
      return { user: null, profile: null };
    }

    const repo = new ProfileRepository(this.supabase);
    const profile = await repo.getByUserId(data.user.id);

    return { user: data.user, profile };
  }

  async verifyEmailOtpForSignup(email: string, code: string) {
    const { data, error } = await this.supabase.auth.verifyOtp({
      email,
      token: code,
      type: "signup",
    });

    if (error) {
      throw error;
    }
    if (!data.user) {
      return { user: null, profile: null };
    }

    const user = data.user;

    const raw = (user.user_metadata as UserMetadata)?.updatesOptIn;
    const updatesOptIn = raw === true || raw === "true";

    const adminClient = createSupabaseAdminClient();

    const { data: firstTenant, error: tenantError } = await adminClient
      .from("tenants")
      .select("id")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (tenantError) {
      throw new Error(`Failed to get tenant: ${tenantError.message}`);
    }

    if (!firstTenant) {
      throw new Error("No tenant found in database. Please run seed script.");
    }

    const profileRepo = new ProfileRepository(adminClient);
    await profileRepo.ensureProfile(user.id, user.email!, firstTenant.id);

    if (updatesOptIn) {
      const emailRepo = new EmailSubscriberRepository(adminClient);
      await emailRepo.subscribe(user.email!, "signup").catch(() => {
        // don't fail verification if subscription fails
      });
    }

    const profile = await profileRepo.getByUserId(user.id);
    return { user, profile };
  }

  async ensureProfileForCurrentUser(defaultUpdatesOptIn: boolean) {
    const {
      data: { user },
    } = await this.supabase.auth.getUser();

    if (!user || !user.email) {
      return { user: null, profile: null };
    }

    const adminClient = createSupabaseAdminClient();
    const { data: firstTenant } = await adminClient
      .from("tenants")
      .select("id")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    const tenantId = firstTenant?.id;

    const repo = new ProfileRepository(adminClient);
    await repo.ensureProfile(user.id, user.email, tenantId);

    const emailRepo = new EmailSubscriberRepository(adminClient);
    const wasSubscribed = await emailRepo.isSubscribed(user.email);

    if (wasSubscribed || defaultUpdatesOptIn) {
      await emailRepo.subscribe(user.email, "oauth").catch(() => {});
    }

    const profile = await repo.getByUserId(user.id);
    return { user, profile };
  }

  async getCurrentUserProfile() {
    const {
      data: { user },
    } = await this.supabase.auth.getUser();

    if (!user) {
      return { user: null, profile: null };
    }

    const repo = new ProfileRepository(this.supabase);
    const profile = await repo.getByUserId(user.id);

    return { user, profile };
  }
}
