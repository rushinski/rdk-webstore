import type { TypedSupabaseClient } from "@/lib/supabase/server";
import type { Tables, TablesInsert } from "@/types/database.types";

export type AdminNotificationRow = Tables<"admin_notifications">;
export type AdminNotificationInsert = TablesInsert<"admin_notifications">;

export class AdminNotificationsRepository {
  constructor(private readonly supabase: TypedSupabaseClient) {}

  async listForAdmin(adminId: string, params?: { limit?: number; unreadOnly?: boolean }) {
    let query = this.supabase
      .from("admin_notifications")
      .select("*")
      .eq("admin_id", adminId)
      .order("created_at", { ascending: false });

    if (params?.unreadOnly) {
      query = query.is("read_at", null);
    }

    if (params?.limit) {
      query = query.limit(params.limit);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
  }

  async insertMany(rows: AdminNotificationInsert[]) {
    if (rows.length === 0) return [];
    const { data, error } = await this.supabase
      .from("admin_notifications")
      .insert(rows)
      .select();

    if (error) throw error;
    return data ?? [];
  }

  async markRead(adminId: string, notificationIds: string[]) {
    if (notificationIds.length === 0) return [];
    const { data, error } = await this.supabase
      .from("admin_notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("admin_id", adminId)
      .in("id", notificationIds)
      .select();

    if (error) throw error;
    return data ?? [];
  }

  async markAllRead(adminId: string) {
    const { data, error } = await this.supabase
      .from("admin_notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("admin_id", adminId)
      .is("read_at", null)
      .select();

    if (error) throw error;
    return data ?? [];
  }
}
