// src/services/auth-service.ts
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ProfileRepository } from "@/repositories/profile-repo";

export type VerificationFlow = "signup" | "signin";

export class AuthService {
  static async signUp(email: string, password: string, updatesOptIn: boolean) {
    const supabase = await createSupabaseServerClient();

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          updatesOptIn: updatesOptIn ? "true" : "false"
        }
      }
    });

    if (error) throw error;
  }

  static async signIn(email: string, password: string) {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    if (!data.user) return { user: null, profile: null };

    const repo = new ProfileRepository(supabase);

    const profile = await repo.getByUserId(data.user.id);

    return { user: data.user, profile };
  }

  static async signOut() {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }

  static async sendPasswordReset(email: string) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) throw error;
  }

  static async updatePassword(newPassword: string) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
  }

  static async resendVerification(
    email: string,
    flow: VerificationFlow = "signup",
  ) {
    const supabase = await createSupabaseServerClient();

    // Currently both flows use Supabase's "signup" OTP type for email confirmation.
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
    });

    if (error) throw error;

    // Flow param is here for future branching / logging if needed.
  }
}

