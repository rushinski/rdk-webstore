import type { Database } from "@/types/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";
import { BaseRepo } from "./_base-repo";

export class ProductsRepo extends BaseRepo {
  constructor(opts: {
    supabase: SupabaseClient<Database>;
    requestId?: string;
    userId?: string | null;
    tenantId?: string | null;
  }) {
    super(opts);
  }

  async getById(id: string) {
    const { data, error } = await this.supabase
      .from("products")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) throw error;

    return data;
  }

  async listPublic(page = 1, pageSize = 20) {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, error } = await this.supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) throw error;

    return data;
  }

  async search(params: {
    brand?: string;
    q?: string;
    shoeSize?: number;
    clothingSize?: string;
  }) {
    let query = this.supabase.from("products").select("*");

    if (params.brand) query = query.eq("brand", params.brand);
    if (params.q) query = query.ilike("name", `%${params.q}%`);
    if (params.shoeSize) query = query.contains("shoe_sizes", [params.shoeSize]);
    if (params.clothingSize)
      query = query.contains("clothing_sizes", [params.clothingSize]);

    const { data, error } = await query.limit(50);

    if (error) throw error;
    return data;
  }

  async adminCreate(product: Database["public"]["Tables"]["products"]["Insert"]) {
    const { data, error } = await this.supabase
      .from("products")
      .insert(product)
      .select()
      .single();

    if (error) throw error;

    return data;
  }

  async adminUpdate(
    id: string,
    updates: Database["public"]["Tables"]["products"]["Update"],
  ) {
    const { data, error } = await this.supabase
      .from("products")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return data;
  }

  async adminDelete(id: string) {
    const { error } = await this.supabase
      .from("products")
      .delete()
      .eq("id", id);

    if (error) throw error;
  }
}
