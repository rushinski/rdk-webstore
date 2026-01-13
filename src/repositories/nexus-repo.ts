// src/repositories/nexus-repo.ts

import type { TypedSupabaseClient } from "@/lib/supabase/server";

export type NexusRegistration = {
  id: string;
  tenant_id: string;
  state_code: string;
  registration_type: 'physical' | 'economic';
  is_registered: boolean;
  registered_at: string | null;
  stripe_registration_id: string | null;
  created_at: string;
  updated_at: string;
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
  created_at: string;
  updated_at: string;
};

export class NexusRepository {
  constructor(private readonly supabase: TypedSupabaseClient) {}

  async getRegistrationsByTenant(tenantId: string): Promise<NexusRegistration[]> {
    const { data, error } = await this.supabase
      .from('nexus_registrations')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('state_code');

    if (error) throw error;
    return (data ?? []) as NexusRegistration[];
  }

  async getRegistration(tenantId: string, stateCode: string): Promise<NexusRegistration | null> {
    const { data, error } = await this.supabase
      .from('nexus_registrations')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('state_code', stateCode)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data as NexusRegistration | null;
  }

  async upsertRegistration(registration: {
    tenantId: string;
    stateCode: string;
    registrationType: 'physical' | 'economic';
    isRegistered: boolean;
    registeredAt?: string | null;
    stripeRegistrationId?: string | null;
  }): Promise<NexusRegistration> {
    const { data, error } = await this.supabase
      .from('nexus_registrations')
      .upsert({
        tenant_id: registration.tenantId,
        state_code: registration.stateCode,
        registration_type: registration.registrationType,
        is_registered: registration.isRegistered,
        registered_at: registration.registeredAt ?? null,
        stripe_registration_id: registration.stripeRegistrationId ?? null,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'tenant_id,state_code'
      })
      .select()
      .single();

    if (error) throw error;
    return data as NexusRegistration;
  }

  async getStateSales(
    tenantId: string,
    stateCode: string,
    windowType: 'calendar' | 'rolling'
  ): Promise<{ totalSales: number; taxableSales: number; transactionCount: number }> {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    let query = this.supabase
      .from('state_sales_tracking')
      .select('total_sales, taxable_sales, transaction_count')
      .eq('tenant_id', tenantId)
      .eq('state_code', stateCode);

    if (windowType === 'calendar') {
      // Calendar year only
      query = query.eq('year', currentYear);
    } else {
      // Rolling 12 months
      const startDate = new Date(now);
      startDate.setMonth(startDate.getMonth() - 12);
      const startYear = startDate.getFullYear();
      const startMonth = startDate.getMonth() + 1;

      query = query.or(
        `and(year.eq.${currentYear},month.gte.${currentMonth}),and(year.eq.${startYear},month.gte.${startMonth})`
      );
    }

    const { data, error } = await query;

    if (error) throw error;

    const totals = (data ?? []).reduce(
      (acc, row) => ({
        totalSales: acc.totalSales + Number(row.total_sales ?? 0),
        taxableSales: acc.taxableSales + Number(row.taxable_sales ?? 0),
        transactionCount: acc.transactionCount + Number(row.transaction_count ?? 0)
      }),
      { totalSales: 0, taxableSales: 0, transactionCount: 0 }
    );

    return totals;
  }

  async getAllStateSales(
    tenantId: string,
    windowType: 'calendar' | 'rolling'
  ): Promise<Map<string, { totalSales: number; taxableSales: number; transactionCount: number }>> {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    let query = this.supabase
      .from('state_sales_tracking')
      .select('state_code, total_sales, taxable_sales, transaction_count')
      .eq('tenant_id', tenantId);

    if (windowType === 'calendar') {
      query = query.eq('year', currentYear);
    } else {
      const startDate = new Date(now);
      startDate.setMonth(startDate.getMonth() - 12);
      const startYear = startDate.getFullYear();
      const startMonth = startDate.getMonth() + 1;

      query = query.or(
        `and(year.eq.${currentYear},month.gte.${currentMonth}),and(year.eq.${startYear},month.gte.${startMonth})`
      );
    }

    const { data, error } = await query;

    if (error) throw error;

    const salesMap = new Map<string, { totalSales: number; taxableSales: number; transactionCount: number }>();

    (data ?? []).forEach(row => {
      const existing = salesMap.get(row.state_code) ?? { totalSales: 0, taxableSales: 0, transactionCount: 0 };
      salesMap.set(row.state_code, {
        totalSales: existing.totalSales + Number(row.total_sales ?? 0),
        taxableSales: existing.taxableSales + Number(row.taxable_sales ?? 0),
        transactionCount: existing.transactionCount + Number(row.transaction_count ?? 0)
      });
    });

    return salesMap;
  }
}