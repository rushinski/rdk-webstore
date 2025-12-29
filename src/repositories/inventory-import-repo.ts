import type { TypedSupabaseClient } from "@/lib/supabase/server";
import type { Tables, TablesInsert, TablesUpdate } from "@/types/database.types";

type ImportRow = Tables<"inventory_imports">;
type ImportInsert = TablesInsert<"inventory_imports">;
type ImportUpdate = TablesUpdate<"inventory_imports">;

type ImportRowLogInsert = TablesInsert<"inventory_import_rows">;

type ExternalVariantRow = Tables<"inventory_external_variants">;
type ExternalVariantInsert = TablesInsert<"inventory_external_variants">;
type ExternalVariantUpdate = TablesUpdate<"inventory_external_variants">;

export class InventoryImportRepository {
  constructor(private readonly supabase: TypedSupabaseClient) {}

  async findImportByChecksum(tenantId: string, checksum: string): Promise<ImportRow | null> {
    const { data, error } = await this.supabase
      .from("inventory_imports")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("checksum", checksum)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data ?? null;
  }

  async createImport(payload: ImportInsert): Promise<ImportRow> {
    const { data, error } = await this.supabase
      .from("inventory_imports")
      .insert(payload)
      .select()
      .single();

    if (error) throw error;
    return data as ImportRow;
  }

  async getImportById(importId: string): Promise<ImportRow | null> {
    const { data, error } = await this.supabase
      .from("inventory_imports")
      .select("*")
      .eq("id", importId)
      .maybeSingle();

    if (error) throw error;
    return data ?? null;
  }

  async updateImport(importId: string, payload: ImportUpdate): Promise<ImportRow> {
    const { data, error } = await this.supabase
      .from("inventory_imports")
      .update(payload)
      .eq("id", importId)
      .select()
      .single();

    if (error) throw error;
    return data as ImportRow;
  }

  async insertImportRows(rows: ImportRowLogInsert[]) {
    if (rows.length === 0) return;
    const { error } = await this.supabase.from("inventory_import_rows").insert(rows);
    if (error) throw error;
  }

  async getExternalVariantByToken(
    tenantId: string,
    token: string
  ): Promise<ExternalVariantRow | null> {
    const { data, error } = await this.supabase
      .from("inventory_external_variants")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("token", token)
      .maybeSingle();

    if (error) throw error;
    return data ?? null;
  }

  async createExternalVariant(payload: ExternalVariantInsert): Promise<ExternalVariantRow> {
    const { data, error } = await this.supabase
      .from("inventory_external_variants")
      .insert(payload)
      .select()
      .single();

    if (error) throw error;
    return data as ExternalVariantRow;
  }

  async updateExternalVariant(
    externalId: string,
    payload: ExternalVariantUpdate
  ): Promise<ExternalVariantRow> {
    const { data, error } = await this.supabase
      .from("inventory_external_variants")
      .update(payload)
      .eq("id", externalId)
      .select()
      .single();

    if (error) throw error;
    return data as ExternalVariantRow;
  }
}
