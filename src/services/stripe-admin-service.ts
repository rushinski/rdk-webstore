// src/services/stripe-admin-service.ts
import Stripe from 'stripe';
import { stripe } from '@/lib/stripe/stripe-server';
import type { TypedSupabaseClient } from "@/lib/supabase/server";
import { ProfileRepository } from '@/repositories/profile-repo';

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

  async getStripeAccountSummary(params: { userId: string, tenantId: string }): Promise<StripeAccountSummary> {
    // ✅ Get the Stripe account for the TENANT, not the user
    const stripeAccountId = await this.profileRepo.getStripeAccountIdForTenant(params.tenantId);

    if (!stripeAccountId) {
      return {
        account: null,
        balance: null,
        payout_schedule: null,
        bank_accounts: [],
      };
    }

    const [account, balance, externalAccounts] = await Promise.all([
      stripe.accounts.retrieve(stripeAccountId),
      stripe.balance.retrieve({}, { stripeAccount: stripeAccountId }),
      stripe.accounts.listExternalAccounts(stripeAccountId, {
        object: 'bank_account',
        limit: 10,
      }),
    ]);

    const bankAccounts = externalAccounts.data
      .filter((ea) => ea.object === 'bank_account')
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
    };
  }

  async ensureExpressAccount(params: { userId: string, tenantId: string}): Promise<{ accountId: string }> {
    // ✅ Check if tenant already has a Stripe account
    let stripeAccountId = await this.profileRepo.getStripeAccountIdForTenant(params.tenantId);

    if (!stripeAccountId) {
      // Get the user's profile to use their email for account creation
      const profile = await this.profileRepo.getByUserId(params.userId);
      
      if (!profile) throw new Error('Admin profile not found.');

      const account = await stripe.accounts.create({
        type: 'express',
        email: profile.email ?? undefined,
        country: 'US',
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        settings: {
          payouts: {
            schedule: {
              interval: 'daily',
            },
          },
        },
      });

      stripeAccountId = account.id;
      
      // ✅ Store the account ID on the user's profile
      // Since all admins in a tenant share the same account, storing it on 
      // the primary admin's profile is fine (and your getStripeAccountIdForTenant 
      // will find it for other admins)
      await this.profileRepo.setStripeAccountId(params.userId, stripeAccountId);
    }

    return { accountId: stripeAccountId };
  }

  async createAccountSession(params: { accountId: string }): Promise<{ clientSecret: string }> {
    const accountSession = await stripe.accountSessions.create({
      account: params.accountId,
      components: {
        account_onboarding: {
          enabled: true,
          features: {
            external_account_collection: true,
          },
        },
        account_management: {
          enabled: true,
          features: {
            external_account_collection: true,
          },
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

  async listPayouts(params: { accountId: string; limit?: number }): Promise<StripePayoutDTO[]> {
    const payouts = await stripe.payouts.list(
      { limit: params.limit ?? 50 }, 
      { stripeAccount: params.accountId }
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
    method: 'standard' | 'instant';
  }) {
    return stripe.payouts.create(
      {
        amount: params.amount,
        currency: params.currency,
        method: params.method,
      },
      { stripeAccount: params.accountId }
    );
  }
}