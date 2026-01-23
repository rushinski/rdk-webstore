// src/services/auth-service.ts
import type { TypedSupabaseClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/service-role";
import { ProfileRepository } from "@/repositories/profile-repo";
import { EmailSubscriberRepository } from "@/repositories/email-subscriber-repo";

export type VerificationFlow = "signup" | "signin";

export class AuthService {
  constructor(private readonly supabase: TypedSupabaseClient) {}

  /**
   * Signup:
   * - Store marketing opt-in INTENT on user_metadata (temporary).
   * - Do NOT write opt-in into profiles (profiles is account/role only).
   * - Subscribe to email_subscribers only AFTER verification.
   */
  async signUp(email: string, password: string, updatesOptIn: boolean) {
    const { error } = await this.supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          // store boolean (still compatible with your old string parse)
          updatesOptIn,
        },
      },
    });

    if (error) {
      throw error;
    }

    // IMPORTANT:
    // No email_subscribers insert here.
    // We only add to email_subscribers after they verify the signup code.
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

  // Note: flow param kept for compatibility with your existing callers.
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

    // Do not leak user existence
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

  /**
   * Signup verification:
   * - Ensure profile exists (no updates_opt_in column).
   * - If user opted in (stored in metadata), insert into email_subscribers.
   * - Use admin client to get tenant_id since RLS blocks unauthenticated queries
   */
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

    // Backward compatible parse (supports boolean or old "true"/"false" strings)
    const raw = (user.user_metadata as any)?.updatesOptIn;
    const updatesOptIn = raw === true || raw === "true";

    // CRITICAL: Use admin client to bypass RLS when querying tenants
    // During signup, the user is being created, so RLS policies that check
    // auth.uid() will fail. Admin client bypasses RLS.
    const adminClient = createSupabaseAdminClient();

    // Get the default tenant using admin client
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

    // Now create profile with the tenant_id using admin client
    const profileRepo = new ProfileRepository(adminClient);
    await profileRepo.ensureProfile(user.id, user.email!, firstTenant.id);

    // Subscribe ONLY after verification
    if (updatesOptIn) {
      const emailRepo = new EmailSubscriberRepository(adminClient);
      await emailRepo.subscribe(user.email!, "signup").catch(() => {
        // don't fail verification if subscription fails
      });
    }

    // Get the created profile
    const profile = await profileRepo.getByUserId(user.id);
    return { user, profile };
  }

  /**
   * OAuth / existing session path.
   * - Profile creation only (no opt-in in profiles).
   * - If already subscribed OR default opt-in passed in, ensure email_subscribers row exists.
   */
  async ensureProfileForCurrentUser(defaultUpdatesOptIn: boolean) {
    const {
      data: { user },
    } = await this.supabase.auth.getUser();

    if (!user || !user.email) {
      return { user: null, profile: null };
    }

    // Use admin client for tenant lookup
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
