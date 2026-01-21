// src/repositories/payment-settings-repo.ts
import type { TypedSupabaseClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/db/database.types";

export type TenantPaymentSettings = Tables<"tenant_payment_settings">;

export class PaymentSettingsRepository {
  constructor(private readonly supabase: TypedSupabaseClient) {}

  async getByTenant(tenantId: string): Promise<TenantPaymentSettings | null> {
    const { data, error } = await this.supabase
      .from("tenant_payment_settings")
      .select("*")
      .eq("tenant_id", tenantId)
      .single();

    if (error && (error as any).code !== "PGRST116") throw error;
    return data ?? null;
  }

  async upsert(settings: {
    tenantId: string;
    useAutomaticPaymentMethods: boolean;
    paymentMethodTypes: string[];
    expressCheckoutMethods: string[];
  }): Promise<TenantPaymentSettings> {
    const { data, error } = await this.supabase
      .from("tenant_payment_settings")
      .upsert(
        {
          tenant_id: settings.tenantId,
          use_automatic_payment_methods: settings.useAutomaticPaymentMethods,
          payment_method_types: settings.paymentMethodTypes,
          express_checkout_methods: settings.expressCheckoutMethods,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "tenant_id" },
      )
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}
