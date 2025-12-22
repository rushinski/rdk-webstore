// src/repositories/email-subscriber-repo.ts
import type { TypedSupabaseClient } from "@/lib/supabase/server";

export interface EmailSubscriber {
  id: string;
  email: string;
  subscribed_at: string;
  source: string | null;
}

export class EmailSubscriberRepository {
  constructor(private readonly supabase: TypedSupabaseClient) {}

  async subscribe(email: string, source: string = 'website'): Promise<void> {
    const normalizedEmail = email.trim().toLowerCase();

    // Check if already exists
    const { data: existing } = await this.supabase
      .from("email_subscribers")
      .select("id")
      .eq("email", normalizedEmail)
      .maybeSingle();

    // If already exists, silently succeed
    if (existing) return;

    // Insert new subscriber
    const { error } = await this.supabase
      .from("email_subscribers")
      .insert({ email: normalizedEmail, source });

    // Ignore unique constraint violations (race condition)
    if (error && !error.message.includes('duplicate') && !error.code?.includes('23505')) {
      throw error;
    }
  }

  async isSubscribed(email: string): Promise<boolean> {
    const { data } = await this.supabase
      .from("email_subscribers")
      .select("id")
      .eq("email", email.trim().toLowerCase())
      .maybeSingle();

    return !!data;
  }

  async unsubscribe(email: string): Promise<void> {
    const { error } = await this.supabase
      .from("email_subscribers")
      .delete()
      .eq("email", email.trim().toLowerCase());

    if (error) throw error;
  }
}