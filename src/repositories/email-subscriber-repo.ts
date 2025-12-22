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
    const { error } = await this.supabase
      .from("email_subscribers")
      .insert({ email: email.trim().toLowerCase(), source })
      .onConflict('email')
      .ignore();

    if (error) throw error;
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