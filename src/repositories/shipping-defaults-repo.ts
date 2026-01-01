// src/repositories/shipping-defaults-repo.ts
import type { TypedSupabaseClient } from "@/lib/supabase/server";
import type { Tables, TablesInsert } from "@/types/database.types";

type ShippingDefaultRow = Tables<"shipping_defaults">;
type ShippingDefaultInsert = TablesInsert<"shipping_defaults">;

export class ShippingDefaultsRepository {
  constructor(private readonly supabase: TypedSupabaseClient) {}

  async list(tenantId?: string | null): Promise<ShippingDefaultRow[]> {
    let query = this.supabase.from("shipping_defaults").select("*");

    if (tenantId) {
      query = query.eq("tenant_id", tenantId);
    } else {
      query = query.is("tenant_id", null);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
  }

  async getByCategories(
    tenantId: string | null,
    categories: string[]
  ): Promise<ShippingDefaultRow[]> {
    if (categories.length === 0) return [];

    let query = this.supabase
      .from("shipping_defaults")
      .select("*")
      .in("category", categories);

    if (tenantId) {
      query = query.eq("tenant_id", tenantId);
    } else {
      query = query.is("tenant_id", null);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
  }

  async upsertDefaults(
    tenantId: string | null,
    defaults: Array<Pick<ShippingDefaultInsert, "category" | "default_price">>
  ): Promise<ShippingDefaultRow[]> {
    const rows: ShippingDefaultInsert[] = defaults.map((entry) => ({
      category: entry.category,
      default_price: entry.default_price ?? 0,
      tenant_id: tenantId ?? null,
    }));

    const { data, error } = await this.supabase
      .from("shipping_defaults")
      .upsert(rows, { onConflict: "tenant_id,category" })
      .select();

    if (error) throw error;
    return data ?? [];
  }
}
