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

  async notifyChatCreated(chatId: string, orderId?: string | null) {
    const staff = await this.profilesRepo.listStaffProfiles();
    const recipients = staff.filter(
      (admin) => admin.admin_chat_created_notifications_enabled !== false
    );

    const message = orderId
      ? `New pickup chat started for order #${orderId.slice(0, 8)}`
      : "New chat started";

    const rows = recipients.map((admin) => ({
      admin_id: admin.id,
      type: "chat_created",
      message,
      order_id: orderId ?? null,
      chat_id: chatId,
    }));

    await this.notificationsRepo.insertMany(rows);
  }

  async notifyChatMessage(chatId: string, messagePreview: string, excludeAdminId?: string) {
    const staff = await this.profilesRepo.listStaffProfiles();
    const recipients = staff.filter(
      (admin) =>
        admin.chat_notifications_enabled !== false &&
        (!excludeAdminId || admin.id !== excludeAdminId)
    );

    const rows = recipients.map((admin) => ({
      admin_id: admin.id,
      type: "chat_message",
      message: messagePreview,
      chat_id: chatId,
    }));

    await this.notificationsRepo.insertMany(rows);
  }
}
