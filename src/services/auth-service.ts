// src/services/auth-service.ts
import type { TypedSupabaseClient } from "@/lib/supabase/server";
import { ProfileRepository } from "@/repositories/profile-repo";

export type VerificationFlow = "signup" | "signin";

export class AuthService {
  constructor(private readonly supabase: TypedSupabaseClient) {}

  async signUp(email: string, password: string, updatesOptIn: boolean) {
    const { error } = await this.supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          updatesOptIn: updatesOptIn ? "true" : "false",
        },
      },
    });

    if (error) throw error;
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

  async updatePassword(newPassword: string) {
    const { error } = await this.supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) throw error;
  }

  async resendVerification(email: string, flow: VerificationFlow = "signup") {
    // Currently both flows use Supabase's "signup" OTP type for email confirmation.
    const { error } = await this.supabase.auth.resend({
      type: "signup",
      email,
    });

    if (error) throw error;

    // Flow param is here for future branching / logging if needed.
  }

  async requestEmailOtpForSignIn(email: string) {
    const { error } = await this.supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: false,
      },
    });

    // We intentionally DO NOT throw on "User not found" to avoid email enumeration.
    if (error && !error.message.toLowerCase().includes("user not found")) {
      throw error;
    }
  }

  /**
   * Verify a one-time code and create a session.
   * Mirrors signIn() return shape.
   */
  async verifyEmailOtpForSignIn(email: string, code: string) {
    const { data, error } = await this.supabase.auth.verifyOtp({
      email,
      token: code,
      type: "email", // email OTP flow
    });

    if (error) throw error;
    if (!data.user) return { user: null, profile: null };

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

    if (error) throw error;
    if (!data.user) return { user: null, profile: null };

    const user = data.user;

    const rawUpdatesOptIn =
      // metadata may be string or boolean depending on how Supabase stored it
      (user.user_metadata as any)?.updatesOptIn;

    const updatesOptIn =
      rawUpdatesOptIn === true || rawUpdatesOptIn === "true";

    const repo = new ProfileRepository(this.supabase);
    const profile = await repo.ensureProfile(
      user.id,
      user.email!,
      updatesOptIn,
    );

    return { user, profile };
  }
}
