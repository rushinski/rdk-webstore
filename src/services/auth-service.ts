// src/services/auth-service.ts
import type { TypedSupabaseClient } from "@/lib/supabase/server";
import { ProfileRepository } from "@/repositories/profile-repo";
import { EmailSubscriberRepository } from "@/repositories/email-subscriber-repo";

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

    // If user wants updates, subscribe them
    if (updatesOptIn) {
      const emailRepo = new EmailSubscriberRepository(this.supabase);
      await emailRepo.subscribe(email, 'signup').catch(() => {
        // Don't fail signup if email subscription fails
      });
    }
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

  async resendVerification(email: string, flow: VerificationFlow = "signup") {
    const { error } = await this.supabase.auth.resend({
      type: "signup",
      email,
    });

    if (error) throw error;
  }

  async requestEmailOtpForSignIn(email: string) {
    const { error } = await this.supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: false,
      },
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

    const rawUpdatesOptIn = (user.user_metadata as any)?.updatesOptIn;
    const updatesOptIn = rawUpdatesOptIn === true || rawUpdatesOptIn === "true";

    const repo = new ProfileRepository(this.supabase);
    const profile = await repo.ensureProfile(user.id, user.email!, updatesOptIn);

    // Subscribe to emails if opted in
    if (updatesOptIn) {
      const emailRepo = new EmailSubscriberRepository(this.supabase);
      await emailRepo.subscribe(user.email!, 'signup').catch(() => {});
    }

    return { user, profile };
  }

  async ensureProfileForCurrentUser(defaultUpdatesOptIn: boolean) {
    const {
      data: { user },
    } = await this.supabase.auth.getUser();

    if (!user || !user.email) {
      return { user: null, profile: null };
    }

    const repo = new ProfileRepository(this.supabase);
    await repo.ensureProfile(user.id, user.email, defaultUpdatesOptIn);

    // Check if they were already subscribed to emails before OAuth
    const emailRepo = new EmailSubscriberRepository(this.supabase);
    const wasSubscribed = await emailRepo.isSubscribed(user.email);

    if (wasSubscribed || defaultUpdatesOptIn) {
      await emailRepo.subscribe(user.email, 'oauth').catch(() => {});
    }

    const profile = await repo.getByUserId(user.id);

    return { user, profile };
  }
}