// src/services/auth-service.ts
import type { TypedSupabaseClient } from "@/lib/supabase/server";
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

    if (error) throw error;

    // IMPORTANT:
    // No email_subscribers insert here.
    // We only add to email_subscribers after they verify the signup code.
  }

  async signIn(email: string, password: string) {
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    if (!data.user) return { user: null, profile: null };

    const repo = new ProfileRepository(this.supabase);
    const profile = await repo.getByUserId(data.user.id);

    return { user: data.user, profile };
  }

  async signOut() {
    const { error } = await this.supabase.auth.signOut();
    if (error) throw error;
  }

  async sendPasswordReset(email: string) {
    const { error } = await this.supabase.auth.resetPasswordForEmail(email);
    if (error) throw error;
  }

  async verifyPasswordResetCode(email: string, code: string) {
    const { data, error } = await this.supabase.auth.verifyOtp({
      email,
      token: code,
      type: "recovery",
    });

    if (error) throw error;
    return data;
  }

  async updatePassword(newPassword: string) {
    const { error } = await this.supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) throw error;
  }

  // Note: flow param kept for compatibility with your existing callers.
  async resendVerification(email: string, _flow: VerificationFlow = "signup") {
    const { error } = await this.supabase.auth.resend({
      type: "signup",
      email,
    });

    if (error) throw error;
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

    if (error) throw error;
    if (!data.user) return { user: null, profile: null };

    const repo = new ProfileRepository(this.supabase);
    const profile = await repo.getByUserId(data.user.id);

    return { user: data.user, profile };
  }

  /**
   * Signup verification:
   * - Ensure profile exists (no updates_opt_in column).
   * - If user opted in (stored in metadata), insert into email_subscribers.
   */
  async verifyEmailOtpForSignup(email: string, code: string) {
    const { data, error } = await this.supabase.auth.verifyOtp({
      email,
      token: code,
      type: "signup",
    });

    if (error) throw error;
    if (!data.user) return { user: null, profile: null };

    const user = data.user;

    // Backward compatible parse (supports boolean or old "true"/"false" strings)
    const raw = (user.user_metadata as any)?.updatesOptIn;
    const updatesOptIn = raw === true || raw === "true";

    const repo = new ProfileRepository(this.supabase);
    await repo.ensureProfile(user.id, user.email!);

    // Subscribe ONLY after verification
    if (updatesOptIn) {
      const emailRepo = new EmailSubscriberRepository(this.supabase);
      await emailRepo.subscribe(user.email!, "signup").catch(() => {
        // don't fail verification if subscription fails
      });
    }

    const profile = await repo.getByUserId(user.id);
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

    const repo = new ProfileRepository(this.supabase);
    await repo.ensureProfile(user.id, user.email);

    const emailRepo = new EmailSubscriberRepository(this.supabase);
    const wasSubscribed = await emailRepo.isSubscribed(user.email);

    if (wasSubscribed || defaultUpdatesOptIn) {
      await emailRepo.subscribe(user.email, "oauth").catch(() => {});
    }

    const profile = await repo.getByUserId(user.id);
    return { user, profile };
  }
}
