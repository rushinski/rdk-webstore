// src/repositories/nexus-repo.ts

import type { TypedSupabaseClient } from "@/lib/supabase/server";

export type NexusRegistration = {
  id: string;
  tenant_id: string;
  state_code: string;
  registration_type: "physical" | "economic";
  is_registered: boolean;
  registered_at: string | null;
  stripe_registration_id: string | null;
  created_at: string;
  updated_at: string;
  tracking_started_at: string | null;
};

export type StateSalesTracking = {
  id: string;
  tenant_id: string;
  state_code: string;
  year: number;
  month: number;
  total_sales: number;
  taxable_sales: number;
  transaction_count: number;
  tax_collected: number; // NEW: Track tax collected
  created_at: string;
  updated_at: string;
};

export type StateSalesLog = {
  order_id: string;
  created_at: string | null;
  total: number;
  tax_amount: number;
  customer_state: string;
  fulfillment: string;
  status: string;
};

export class NexusRepository {
  constructor(private readonly supabase: TypedSupabaseClient) {}

  private buildLast12MonthsOr(now: Date): string {
    // Build 12 exact (year, month) clauses inclusive of current month.
    // Example: and(year.eq.2026,month.eq.1),and(year.eq.2025,month.eq.12),...
    const clauses: string[] = [];

    const cursor = new Date(now.getFullYear(), now.getMonth(), 1);
    for (let i = 0; i < 12; i++) {
      const y = cursor.getFullYear();
      const m = cursor.getMonth() + 1;
      clauses.push(`and(year.eq.${y},month.eq.${m})`);
      cursor.setMonth(cursor.getMonth() - 1);
    }

    return clauses.join(",");
  }

  async getRegistrationsByTenant(tenantId: string): Promise<NexusRegistration[]> {
    const { data, error } = await this.supabase
      .from("nexus_registrations")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("state_code");

    if (error) {
      throw error;
    }
    return (data ?? []) as NexusRegistration[];
  }

  async getRegistration(
    tenantId: string,
    stateCode: string,
  ): Promise<NexusRegistration | null> {
    const { data, error } = await this.supabase
      .from("nexus_registrations")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("state_code", stateCode)
      .single();

    if (error && error.code !== "PGRST116") {
      throw error;
    }
    return data as NexusRegistration | null;
  }

  async upsertRegistration(registration: {
    tenantId: string;
    stateCode: string;
    registrationType: "physical" | "economic";
    isRegistered: boolean;
    registeredAt?: string | null;
    stripeRegistrationId?: string | null;
  }): Promise<NexusRegistration> {
    // Read existing so we can preserve tracking_started_at once it exists
    const existing = await this.getRegistration(
      registration.tenantId,
      registration.stateCode,
    );

    const trackingStartedAt = existing?.tracking_started_at ?? new Date().toISOString(); // set once (first time row is created)

    const { data, error } = await this.supabase
      .from("nexus_registrations")
      .upsert(
        {
          tenant_id: registration.tenantId,
          state_code: registration.stateCode,
          registration_type: registration.registrationType,
          is_registered: registration.isRegistered,
          registered_at: registration.registeredAt ?? null,
          stripe_registration_id: registration.stripeRegistrationId ?? null,
          tracking_started_at: registration.isRegistered ? trackingStartedAt : null,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "tenant_id,state_code",
        },
      )
      .select()
      .single();

    if (error) {
      throw error;
    }
    return data as NexusRegistration;
  }

  async getAllStateSales(
    tenantId: string,
    windowType: "calendar" | "rolling",
  ): Promise<
    Map<
      string,
      {
        totalSales: number;
        taxableSales: number;
        transactionCount: number;
        taxCollected: number;
      }
    >
  > {
    const now = new Date();
    const currentYear = now.getFullYear();

    let query = this.supabase
      .from("state_sales_tracking")
      .select(
        "state_code, total_sales, taxable_sales, transaction_count, tax_collected, year, month",
      )
      .eq("tenant_id", tenantId);

    if (windowType === "calendar") {
      query = query.eq("year", currentYear);
    } else {
      // Correct rolling 12 months: exactly last 12 (year, month) buckets
      query = query.or(this.buildLast12MonthsOr(now));
    }

    const { data, error } = await query;
    if (error) {
      throw error;
    }

    const salesMap = new Map<
      string,
      {
        totalSales: number;
        taxableSales: number;
        transactionCount: number;
        taxCollected: number;
      }
    >();

    (data ?? []).forEach((row) => {
      const existing = salesMap.get(row.state_code) ?? {
        totalSales: 0,
        taxableSales: 0,
        transactionCount: 0,
        taxCollected: 0,
      };

      salesMap.set(row.state_code, {
        totalSales: existing.totalSales + Number(row.total_sales ?? 0),
        taxableSales: existing.taxableSales + Number(row.taxable_sales ?? 0),
        transactionCount: existing.transactionCount + Number(row.transaction_count ?? 0),
        taxCollected: existing.taxCollected + Number(row.tax_collected ?? 0),
      });
    });

    return salesMap;
  }

  // NEW: earliest tracking month per state (used to compute rolling “period start”)
  async getTrackingStartByState(
    tenantId: string,
  ): Promise<Map<string, { year: number; month: number }>> {
    const { data, error } = await this.supabase
      .from("state_sales_tracking")
      .select("state_code, year, month")
      .eq("tenant_id", tenantId)
      .order("year", { ascending: true })
      .order("month", { ascending: true });

    if (error) {
      throw error;
    }

    const map = new Map<string, { year: number; month: number }>();
    (data ?? []).forEach((row) => {
      if (!map.has(row.state_code)) {
        map.set(row.state_code, { year: Number(row.year), month: Number(row.month) });
      }
    });

    return map;
  }

  async getStateSalesLog(params: {
    tenantId: string;
    stateCode: string;
    limit?: number;
    offset?: number;
  }): Promise<{ sales: StateSalesLog[]; total: number }> {
    const limit = params.limit ?? 10;
    const offset = params.offset ?? 0;

    const { data, error, count } = await this.supabase
      .from("orders")
      .select("id, created_at, total, tax_amount, customer_state, fulfillment, status", {
        count: "exact",
      })
      .eq("tenant_id", params.tenantId)
      .eq("customer_state", params.stateCode)
      .eq("status", "paid")
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw error;
    }

    const sales: StateSalesLog[] = (data ?? []).map((order) => ({
      order_id: order.id,
      created_at: order.created_at,
      total: Number(order.total ?? 0),
      tax_amount: Number(order.tax_amount ?? 0),
      customer_state: order.customer_state ?? params.stateCode,
      fulfillment: order.fulfillment ?? "ship",
      status: order.status ?? "paid",
    }));

    return {
      sales,
      total: count ?? 0,
    };
  }

  /**
   * Record a sale for nexus tracking
   * This should be called when an order is marked as paid
   */
  async recordSale(params: {
    tenantId: string;
    stateCode: string;
    orderTotal: number;
    taxAmount: number;
    isTaxable: boolean;
  }): Promise<void> {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    // Upsert the tracking record
    const { error } = await this.supabase.from("state_sales_tracking").upsert(
      {
        tenant_id: params.tenantId,
        state_code: params.stateCode,
        year,
        month,
        total_sales: params.orderTotal,
        taxable_sales: params.isTaxable ? params.orderTotal : 0,
        transaction_count: 1,
        tax_collected: params.taxAmount,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "tenant_id,state_code,year,month",
        // Increment existing values
        ignoreDuplicates: false,
      },
    );

    if (error) {
      throw error;
    }
  }
}
