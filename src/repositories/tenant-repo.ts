// src/repositories/tenant-repo.ts
import type { TypedSupabaseClient } from "@/lib/supabase/server";
import type { Tables, TablesInsert } from "@/types/db/database.types";

type TenantRow = Tables<"tenants">;
type TenantInsert = TablesInsert<"tenants">;

export class TenantRepository {
  constructor(private readonly supabase: TypedSupabaseClient) {}

  async getFirstTenantId(): Promise<string | null> {
    const { data, error } = await this.supabase
      .from("tenants")
      .select("id")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data?.id ?? null;
  }

  async create(name: string): Promise<TenantRow> {
    const insert: TenantInsert = { name };
    const { data, error } = await this.supabase
      .from("tenants")
      .insert(insert)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}
