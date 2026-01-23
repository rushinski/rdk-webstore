// src/repositories/payout-settings-repo.ts
import type { TypedSupabaseClient } from "@/lib/supabase/server";
import type { Tables, TablesInsert } from "@/types/db/database.types";

export type PayoutSettingsRow = Tables<"payout_settings">;
export type PayoutSettingsInsert = TablesInsert<"payout_settings">;

export class PayoutSettingsRepository {
  constructor(private readonly supabase: TypedSupabaseClient) {}

  async get(): Promise<PayoutSettingsRow | null> {
    const { data, error } = await this.supabase
      .from("payout_settings")
      .select("*")
      .limit(1)
      .maybeSingle();

    if (error) {
      throw error;
    }
    return data;
  }

  async upsert(input: {
    primaryAdminId: string;
    provider?: string | null;
    accountLabel?: string | null;
    accountLast4?: string | null;
  }): Promise<PayoutSettingsRow> {
    const insert: PayoutSettingsInsert = {
      primary_admin_id: input.primaryAdminId,
      provider: input.provider ?? null,
      account_label: input.accountLabel ?? null,
      account_last4: input.accountLast4 ?? null,
    };

    const { data: existing } = await this.supabase
      .from("payout_settings")
      .select("id")
      .limit(1)
      .maybeSingle();

    if (existing?.id) {
      const { data, error } = await this.supabase
        .from("payout_settings")
        .update(insert)
        .eq("id", existing.id)
        .select()
        .single();

      if (error) {
        throw error;
      }
      return data as PayoutSettingsRow;
    }

    const { data, error } = await this.supabase
      .from("payout_settings")
      .insert(insert)
      .select()
      .single();

    if (error) {
      throw error;
    }
    return data as PayoutSettingsRow;
  }
}
