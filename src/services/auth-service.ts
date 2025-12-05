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
}
