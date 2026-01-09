// src/repositories/email-subscription-token-repo.ts
import type { TypedSupabaseClient } from "@/lib/supabase/server";

export interface EmailSubscriptionToken {
  id: string;
  email: string;
  token: string;
  source: string | null;
  created_at: string;
  expires_at: string;
}

export class EmailSubscriptionTokenRepository {
  constructor(private readonly supabase: TypedSupabaseClient) {}

  async deleteByEmail(email: string): Promise<void> {
    const { error } = await this.supabase
      .from("email_subscription_tokens")
      .delete()
      .eq("email", email);

    if (error) throw error;
  }

  async createToken(input: {
    email: string;
    token: string;
    source?: string | null;
    expiresAt: string;
  }): Promise<void> {
    const { error } = await this.supabase.from("email_subscription_tokens").insert({
      email: input.email,
      token: input.token,
      source: input.source ?? null,
      expires_at: input.expiresAt,
    });

    if (error) throw error;
  }

  async getByToken(token: string): Promise<EmailSubscriptionToken | null> {
    const { data, error } = await this.supabase
      .from("email_subscription_tokens")
      .select("*")
      .eq("token", token)
      .maybeSingle();

    if (error) throw error;
    return data ?? null;
  }

  async deleteByToken(token: string): Promise<void> {
    const { error } = await this.supabase
      .from("email_subscription_tokens")
      .delete()
      .eq("token", token);

    if (error) throw error;
  }
}
