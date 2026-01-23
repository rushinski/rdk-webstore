// src/services/stripe-admin-service.ts

import type Stripe from "stripe";

import { stripe } from "@/lib/stripe/stripe-server";
import type { TypedSupabaseClient } from "@/lib/supabase/server";
import { ProfileRepository } from "@/repositories/profile-repo";

export type StripeAccountSummary = {
  account: {
    id: string;
    charges_enabled: boolean;
    payouts_enabled: boolean;
    details_submitted: boolean;
    email: string | null;
  } | null;
  balance: {
    available: { amount: number; currency: string }[];
    pending: { amount: number; currency: string }[];
  } | null;
  payout_schedule: Stripe.Account.Settings.Payouts.Schedule | null;
  bank_accounts: Array<{
    id: string;
    bank_name: string | null;
    last4: string | null;
    currency: string | null;
    status: string | null;
    default_for_currency: boolean;
    account_holder_name: string | null;
  }>;
  upcoming_payout: {
    amount: number;
    currency: string;
    arrival_date: number | null;
    estimated: boolean; // Whether this is estimated or an actual scheduled payout
  } | null;
  requirements: {
    currently_due: string[];
    eventually_due: string[];
    past_due: string[];
    pending_verification: string[];
    disabled_reason: string | null;
    errors: Array<{
      code: string;
      reason: string;
      requirement: string;
    }>;
  };
};

export type StripePayoutDTO = {
  id: string;
  amount: number;
  currency: string;
  arrival_date: number | null;
  status: string;
  method: string | null;
  type: string | null;
  created: number;
};

export class StripeAdminService {
  private profileRepo: ProfileRepository;

  constructor(private readonly supabase: TypedSupabaseClient) {
    this.profileRepo = new ProfileRepository(supabase);
  }

  /**
   * Pick the "next" payout similar to Stripe Dashboard behavior:
   * 1) Prefer status=pending (scheduled, not yet sent)
   * 2) If none, allow status=in_transit (sent, not yet arrived)
   * 3) Sort by earliest arrival_date (nulls last), then created as tiebreaker
   */
  private pickNextPayout(payouts: Stripe.Payout[]): Stripe.Payout | null {
    if (!payouts.length) {
      return null;
    }

    const statusRank = (s: Stripe.Payout["status"]) => {
      if (s === "pending") {
        return 0;
      }
      if (s === "in_transit") {
        return 1;
      }
      return 99;
    };

    const sorted = [...payouts].sort((a, b) => {
      const aRank = statusRank(a.status);
      const bRank = statusRank(b.status);
      if (aRank !== bRank) {
        return aRank - bRank;
      }

      const aArr = a.arrival_date ?? Number.MAX_SAFE_INTEGER;
      const bArr = b.arrival_date ?? Number.MAX_SAFE_INTEGER;
      if (aArr !== bArr) {
        return aArr - bArr;
      }

      return a.created - b.created;
    });

    const next = sorted[0];
    if (!next) {
      return null;
    }

    // Only treat these as "upcoming"
    if (next.status !== "pending" && next.status !== "in_transit") {
      return null;
    }

    return next;
  }

  /**
   * Calculate the next scheduled payout date based on the payout schedule
   */
  private calculateNextPayoutDate(
    schedule: Stripe.Account.Settings.Payouts.Schedule | null,
  ): number | null {
    if (!schedule) {
      return null;
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (schedule.interval === "daily") {
      // Next payout is tomorrow (Stripe typically pays out the next business day)
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return Math.floor(tomorrow.getTime() / 1000);
    }

    if (schedule.interval === "weekly") {
      const weeklyAnchor = schedule.weekly_anchor || "monday";
      const dayMap: Record<string, number> = {
        sunday: 0,
        monday: 1,
        tuesday: 2,
        wednesday: 3,
        thursday: 4,
        friday: 5,
        saturday: 6,
      };

      const targetDay = dayMap[weeklyAnchor.toLowerCase()] ?? 1;
      const currentDay = today.getDay();

      let daysUntilNext = targetDay - currentDay;
      if (daysUntilNext <= 0) {
        daysUntilNext += 7; // Next week
      }

      const nextDate = new Date(today);
      nextDate.setDate(nextDate.getDate() + daysUntilNext);
      return Math.floor(nextDate.getTime() / 1000);
    }

    if (schedule.interval === "monthly") {
      const anchor = schedule.monthly_anchor || 1;
      const nextDate = new Date(today);

      // If we're past this month's anchor, go to next month
      if (today.getDate() >= anchor) {
        nextDate.setMonth(nextDate.getMonth() + 1);
      }

      nextDate.setDate(anchor);
      return Math.floor(nextDate.getTime() / 1000);
    }

    if (schedule.interval === "manual") {
      return null; // No automatic payouts scheduled
    }

    return null;
  }

  /**
   * Returns the next expected payout for the connected account.
   * This tries to find an actual scheduled payout first, then falls back
   * to estimating based on the payout schedule and pending balance.
   */
  private async getUpcomingPayoutForAccount(
    stripeAccountId: string,
    balance: Stripe.Balance,
    schedule: Stripe.Account.Settings.Payouts.Schedule | null,
  ): Promise<StripeAccountSummary["upcoming_payout"]> {
    // First, try to find actual scheduled payouts
    const [pendingList, inTransitList] = await Promise.all([
      stripe.payouts.list({ limit: 20, status: "pending" } as any, {
        stripeAccount: stripeAccountId,
      }),
      stripe.payouts.list({ limit: 20, status: "in_transit" } as any, {
        stripeAccount: stripeAccountId,
      }),
    ]);

    const combined: Stripe.Payout[] = [
      ...(pendingList.data ?? []),
      ...(inTransitList.data ?? []),
    ];

    const next = this.pickNextPayout(combined);

    // If we found an actual payout, return it
    if (next) {
      return {
        amount: next.amount,
        currency: next.currency,
        arrival_date: next.arrival_date ?? null,
        estimated: false,
      };
    }

    // No scheduled payout found - estimate based on schedule and pending balance
    // This mimics what Stripe Dashboard does
    if (!schedule || schedule.interval === "manual") {
      // Manual payouts only - no automatic upcoming payout
      return null;
    }

    // Get pending balance for USD (or adapt for multi-currency if needed)
    const pendingBalance = balance.pending.find((b) => b.currency === "usd");

    if (!pendingBalance || pendingBalance.amount === 0) {
      // No pending balance, no upcoming payout to show
      return null;
    }

    const estimatedDate = this.calculateNextPayoutDate(schedule);

    return {
      amount: pendingBalance.amount,
      currency: pendingBalance.currency,
      arrival_date: estimatedDate,
      estimated: true, // Flag this as an estimate
    };
  }

  async getStripeAccountSummary(params: {
    userId: string;
    tenantId: string;
  }): Promise<StripeAccountSummary> {
    const stripeAccountId = await this.profileRepo.getStripeAccountIdForTenant(
      params.tenantId,
    );

    if (!stripeAccountId) {
      return {
        account: null,
        balance: null,
        payout_schedule: null,
        bank_accounts: [],
        upcoming_payout: null,
        requirements: {
          currently_due: [],
          eventually_due: [],
          past_due: [],
          pending_verification: [],
          disabled_reason: null,
          errors: [],
        },
      };
    }

    const [account, balance, externalAccounts] = await Promise.all([
      stripe.accounts.retrieve(stripeAccountId),
      stripe.balance.retrieve({}, { stripeAccount: stripeAccountId }),
      stripe.accounts.listExternalAccounts(stripeAccountId, {
        object: "bank_account",
        limit: 10,
      }),
    ]);

    // Get upcoming payout AFTER we have balance and schedule
    const upcomingPayout = await this.getUpcomingPayoutForAccount(
      stripeAccountId,
      balance,
      account.settings?.payouts?.schedule ?? null,
    );

    const bankAccounts = externalAccounts.data
      .filter((ea) => ea.object === "bank_account")
      .map((ea) => {
        const ba = ea as Stripe.BankAccount;
        return {
          id: ba.id,
          bank_name: ba.bank_name ?? null,
          last4: ba.last4 ?? null,
          currency: ba.currency ?? null,
          status: ba.status ?? null,
          default_for_currency: ba.default_for_currency ?? false,
          account_holder_name: ba.account_holder_name ?? null,
        };
      });

    return {
      account: {
        id: account.id,
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled,
        details_submitted: account.details_submitted,
        email: account.email ?? null,
      },
      balance: {
        available: balance.available,
        pending: balance.pending,
      },
      payout_schedule: account.settings?.payouts?.schedule ?? null,
      bank_accounts: bankAccounts,
      upcoming_payout: upcomingPayout,
      requirements: {
        currently_due: account.requirements?.currently_due || [],
        eventually_due: account.requirements?.eventually_due || [],
        past_due: account.requirements?.past_due || [],
        pending_verification: account.requirements?.pending_verification || [],
        disabled_reason: account.requirements?.disabled_reason || null,
        errors:
          account.requirements?.errors?.map((err) => ({
            code: err.code,
            reason: err.reason,
            requirement: err.requirement,
          })) || [],
      },
    };
  }

  async ensureExpressAccount(params: {
    userId: string;
    tenantId: string;
  }): Promise<{ accountId: string }> {
    let stripeAccountId = await this.profileRepo.getStripeAccountIdForTenant(
      params.tenantId,
    );

    if (!stripeAccountId) {
      const profile = await this.profileRepo.getByUserId(params.userId);
      if (!profile) {
        throw new Error("Admin profile not found.");
      }

      const account = await stripe.accounts.create({
        type: "express",
        email: profile.email ?? undefined,
        country: "US",
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        settings: {
          payouts: {
            schedule: {
              interval: "daily",
            },
          },
        },
      });

      stripeAccountId = account.id;
      await this.profileRepo.setStripeAccountId(params.userId, stripeAccountId);
    }

    return { accountId: stripeAccountId };
  }

  async createAccountSession(params: {
    accountId: string;
  }): Promise<{ clientSecret: string }> {
    const accountSession = await stripe.accountSessions.create({
      account: params.accountId,
      components: {
        account_onboarding: {
          enabled: true,
          features: { external_account_collection: true },
        },
        account_management: {
          enabled: true,
          features: { external_account_collection: true },
        },
        notification_banner: {
          enabled: true,
          features: { external_account_collection: true },
        },
        balances: {
          enabled: true,
          features: {
            external_account_collection: true,
            edit_payout_schedule: true,
            instant_payouts: true,
            standard_payouts: true,
          },
        },
        payouts: {
          enabled: true,
          features: {
            external_account_collection: true,
            edit_payout_schedule: true,
            instant_payouts: true,
            standard_payouts: true,
          },
        },
        payments: {
          enabled: true,
          features: {
            refund_management: true,
            dispute_management: true,
            capture_payments: true,
          },
        },
      },
    });

    return { clientSecret: accountSession.client_secret };
  }

  async setDefaultPayoutBank(params: { accountId: string; bankAccountId: string }) {
    await stripe.accounts.updateExternalAccount(params.accountId, params.bankAccountId, {
      default_for_currency: true,
    });
  }

  async deleteBankAccount(params: { accountId: string; bankAccountId: string }) {
    await stripe.accounts.deleteExternalAccount(params.accountId, params.bankAccountId);
  }

  async updatePayoutSchedule(params: {
    accountId: string;
    schedule: Stripe.AccountUpdateParams.Settings.Payouts.Schedule;
  }) {
    await stripe.accounts.update(params.accountId, {
      settings: {
        payouts: { schedule: params.schedule },
      },
    });
  }

  async listPayouts(params: {
    accountId: string;
    limit?: number;
  }): Promise<StripePayoutDTO[]> {
    const payouts = await stripe.payouts.list(
      { limit: params.limit ?? 50 },
      { stripeAccount: params.accountId },
    );

    return payouts.data.map((p) => ({
      id: p.id,
      amount: p.amount,
      currency: p.currency,
      arrival_date: p.arrival_date,
      status: p.status,
      method: p.method,
      type: p.type,
      created: p.created,
    }));
  }

  async createManualPayout(params: {
    accountId: string;
    amount: number;
    currency: string;
    method: "standard" | "instant";
  }) {
    return stripe.payouts.create(
      {
        amount: params.amount,
        currency: params.currency,
        method: params.method,
      },
      { stripeAccount: params.accountId },
    );
  }

  async getAccountRequirements(params: { accountId: string }) {
    const account = await stripe.accounts.retrieve(params.accountId);

    return {
      currently_due: account.requirements?.currently_due || [],
      eventually_due: account.requirements?.eventually_due || [],
      past_due: account.requirements?.past_due || [],
      pending_verification: account.requirements?.pending_verification || [],
      disabled_reason: account.requirements?.disabled_reason || null,
      errors: account.requirements?.errors || [],
    };
  }
}
