import type { TypedSupabaseClient } from "@/lib/supabase/server";
import type { Tables, TablesInsert } from "@/types/database.types";

export type AdminNotificationRow = Tables<"admin_notifications">;
export type AdminNotificationInsert = TablesInsert<"admin_notifications">;

export class AdminNotificationsRepository {
  constructor(private readonly supabase: TypedSupabaseClient) {}

  async listPageForAdmin(
    adminId: string,
    params: { limit: number; page: number; unreadOnly?: boolean }
  ) {
    const { limit, page, unreadOnly } = params;
    const safeLimit = Math.min(Math.max(limit, 1), 50);
    const safePage = Math.max(page, 1);
    const offset = (safePage - 1) * safeLimit;

    let query = this.supabase
      .from("admin_notifications")
      .select("*")
      .eq("admin_id", adminId)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false });

    if (unreadOnly) query = query.is("read_at", null);

    // Fetch one extra to detect "hasMore"
    const { data, error } = await query.range(offset, offset + safeLimit);
    if (error) throw error;

    const rows = data ?? [];
    const hasMore = rows.length > safeLimit;
    return {
      notifications: hasMore ? rows.slice(0, safeLimit) : rows,
      hasMore,
    };
  }

  async countUnread(adminId: string) {
    const { count, error } = await this.supabase
      .from("admin_notifications")
      .select("id", { count: "exact", head: true })
      .eq("admin_id", adminId)
      .is("read_at", null);

    if (error) throw error;
    return count ?? 0;
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

  async deleteMany(adminId: string, ids: string[]) {
    if (ids.length === 0) return [];
    const { data, error } = await this.supabase
      .from("admin_notifications")
      .delete()
      .eq("admin_id", adminId)
      .in("id", ids)
      .select();

    if (error) throw error;
    return data ?? [];
  }

  async deleteAll(adminId: string) {
    const { data, error } = await this.supabase
      .from("admin_notifications")
      .delete()
      .eq("admin_id", adminId)
      .select("id");

    if (error) throw error;
    return data ?? [];
  }
}
