import type { TypedSupabaseClient } from "@/lib/supabase/server";
import { EmailSubscriberRepository } from "@/repositories/email-subscriber-repo";

export class EmailSubscriptionService {
  private repo: EmailSubscriberRepository;

  constructor(private readonly supabase: TypedSupabaseClient) {
    this.repo = new EmailSubscriberRepository(supabase);
  }

  async subscribe(email: string, source?: string) {
    return this.repo.subscribe(email, source);
  }
}
