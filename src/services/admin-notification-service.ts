import type { TypedSupabaseClient } from "@/lib/supabase/server";
import { AdminNotificationsRepository } from "@/repositories/admin-notifications-repo";
import { ProfileRepository } from "@/repositories/profile-repo";

export class AdminNotificationService {
  private notificationsRepo: AdminNotificationsRepository;
  private profilesRepo: ProfileRepository;

  constructor(private readonly supabase: TypedSupabaseClient) {
    this.notificationsRepo = new AdminNotificationsRepository(supabase);
    this.profilesRepo = new ProfileRepository(supabase);
  }

  async notifyOrderPlaced(orderId: string) {
    const staff = await this.profilesRepo.listStaffProfiles();
    const recipients = staff.filter((admin) => admin.admin_order_notifications_enabled !== false);

    const rows = recipients.map((admin) => ({
      admin_id: admin.id,
      type: "order_placed",
      message: `New order #${orderId.slice(0, 8)} placed`,
      order_id: orderId,
    }));

    await this.notificationsRepo.insertMany(rows);
  }

  async notifyChatMessage(
    chatId: string,
    messagePreview: string,
    customerLabel?: string,
    excludeAdminId?: string
  ) {
    const staff = await this.profilesRepo.listStaffProfiles();
    const recipients = staff.filter(
      (admin) =>
        admin.chat_notifications_enabled !== false &&
        (!excludeAdminId || admin.id !== excludeAdminId)
    );

    const label = customerLabel?.trim() || "Customer";
    const rows = recipients.map((admin) => ({
      admin_id: admin.id,
      type: "chat_message",
      message: `New Message - ${label} : ${messagePreview}`,
      chat_id: chatId,
    }));

    await this.notificationsRepo.insertMany(rows);
  }

  async listCenter(adminId: string, params: { limit: number; page: number; unreadOnly?: boolean }) {
    const [{ notifications, hasMore }, unreadCount] = await Promise.all([
      this.notificationsRepo.listPageForAdmin(adminId, params),
      this.notificationsRepo.countUnread(adminId),
    ]);

    return { notifications, hasMore, unreadCount, page: params.page, limit: params.limit };
  }

  async unreadCount(adminId: string) {
    return this.notificationsRepo.countUnread(adminId);
  }

  async markRead(adminId: string, ids: string[]) {
    return this.notificationsRepo.markRead(adminId, ids);
  }

  async markAllRead(adminId: string) {
    return this.notificationsRepo.markAllRead(adminId);
  }

  async deleteMany(adminId: string, ids: string[]) {
    return this.notificationsRepo.deleteMany(adminId, ids);
  }

  async deleteAll(adminId: string) {
    return this.notificationsRepo.deleteAll(adminId);
  }
}
