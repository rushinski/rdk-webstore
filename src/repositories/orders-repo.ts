import type { Database } from "@/types/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";
import { BaseRepo } from "./_base-repo";

export class OrdersRepo extends BaseRepo {
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
      .from("orders")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) throw error;

    return data;
  }

  async listForUser(userId: string) {
    const { data, error } = await this.supabase
      .from("orders")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data;
  }

  async createPending(order: Database["public"]["Tables"]["orders"]["Insert"]) {
    const { data, error } = await this.supabase
      .from("orders")
      .insert(order)
      .select()
      .single();

    if (error) throw error;

    return data;
  }

  async finalizeStripeOrder(stripeSessionId: string, updates: {
    status: "paid";
    total?: number;
  }) {
    const { data, error } = await this.supabase
      .from("orders")
      .update({
        status: updates.status,
        total: updates.total,
      })
      .eq("stripe_session_id", stripeSessionId)
      .select()
      .single();

    if (error) throw error;

    return data;
  }
}
