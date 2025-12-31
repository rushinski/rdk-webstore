import type { TypedSupabaseClient } from "@/lib/supabase/server";
import { EmailSubscriberRepository } from "@/repositories/email-subscriber-repo";
import { EmailSubscriptionTokenRepository } from "@/repositories/email-subscription-token-repo";

export class EmailSubscriptionService {
  private repo: EmailSubscriberRepository;
  private tokenRepo: EmailSubscriptionTokenRepository;

  constructor(private readonly supabase: TypedSupabaseClient) {
    this.repo = new EmailSubscriberRepository(supabase);
    this.tokenRepo = new EmailSubscriptionTokenRepository(supabase);
  }

  async requestConfirmation(
    email: string,
    source: string | undefined,
    token: string,
    expiresAt: string
  ): Promise<"already_subscribed" | "pending"> {
    const normalizedEmail = email.trim().toLowerCase();
    const alreadySubscribed = await this.repo.isSubscribed(normalizedEmail);
    if (alreadySubscribed) return "already_subscribed";

    await this.tokenRepo.deleteByEmail(normalizedEmail);
    await this.tokenRepo.createToken({
      email: normalizedEmail,
      token,
      source: source ?? null,
      expiresAt,
    });

    return "pending";
  }

  async confirmToken(
    token: string
  ): Promise<
    | { status: "invalid" }
    | { status: "expired" }
    | { status: "already_subscribed"; email: string }
    | { status: "confirmed"; email: string }
  > {
    const record = await this.tokenRepo.getByToken(token);
    if (!record) return { status: "invalid" };

    const expiresAt = new Date(record.expires_at);
    if (Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() < Date.now()) {
      await this.tokenRepo.deleteByToken(token);
      return { status: "expired" };
    }

    const alreadySubscribed = await this.repo.isSubscribed(record.email);
    if (alreadySubscribed) {
      await this.tokenRepo.deleteByToken(token);
      return { status: "already_subscribed", email: record.email };
    }

    await this.repo.subscribe(record.email, record.source ?? undefined);
    await this.tokenRepo.deleteByToken(token);
    return { status: "confirmed", email: record.email };
  }
}
