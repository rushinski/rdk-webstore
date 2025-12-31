import type { TypedSupabaseClient } from "@/lib/supabase/server";
import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import { ChatsRepository } from "@/repositories/chats-repo";
import { ChatMessagesRepository } from "@/repositories/chat-messages-repo";
import { OrdersRepository } from "@/repositories/orders-repo";
import {
  ProfileRepository,
  isAdminRole,
  isProfileRole,
} from "@/repositories/profile-repo";
import { ChatEmailService } from "@/services/chat-email-service";
import { AdminNotificationService } from "@/services/admin-notification-service";
import { log } from "@/lib/log";

export class ChatService {
  private chatsRepo: ChatsRepository;
  private messagesRepo: ChatMessagesRepository;
  private ordersRepo: OrdersRepository;
  private profilesRepo: ProfileRepository;
  private chatEmailService: ChatEmailService;

  constructor(
    private readonly supabase: TypedSupabaseClient,
    private readonly adminSupabase?: AdminSupabaseClient
  ) {
    this.chatsRepo = new ChatsRepository(supabase);
    this.messagesRepo = new ChatMessagesRepository(supabase);
    this.ordersRepo = new OrdersRepository(supabase);
    this.profilesRepo = new ProfileRepository(supabase);
    this.chatEmailService = new ChatEmailService();
  }

  async getOpenChatForUser(userId: string) {
    return this.chatsRepo.getOpenChatForUser(userId);
  }

  async createChatForUser(input: { userId: string; orderId?: string | null }) {
    const existing = await this.chatsRepo.getOpenChatForUser(input.userId);
    if (existing) return { chat: existing, created: false };

    let source: "manual" | "order" = "manual";
    let orderId: string | null = null;

    if (input.orderId) {
      const order = await this.ordersRepo.getByIdAndUser(input.orderId, input.userId);
      if (!order) throw new Error("Order not found");
      if (order.fulfillment !== "pickup") throw new Error("Invalid fulfillment");
      if (order.status !== "paid") throw new Error("Order not ready");
      source = "order";
      orderId = order.id;
    }

    const chat = await this.chatsRepo.createChat({
      userId: input.userId,
      orderId,
      source,
    });

    if (this.adminSupabase) {
      const notifications = new AdminNotificationService(this.adminSupabase);
      await notifications.notifyChatCreated(chat.id, orderId);
    }

    return { chat, created: true };
  }

  async listAdminChats(params?: { status?: "open" | "closed" }) {
    return this.chatsRepo.listAdminChats(params);
  }

  async listMessages(chatId: string) {
    return this.messagesRepo.listByChatId(chatId);
  }

  async sendMessage(input: { chatId: string; senderId: string; body: string }) {
    const chat = await this.chatsRepo.getById(input.chatId);
    if (!chat) throw new Error("Chat not found");
    if (chat.status === "closed") throw new Error("Chat closed");

    const profile = await this.profilesRepo.getByUserId(input.senderId);
    const profileRole = isProfileRole(profile?.role) ? profile!.role : "customer";

    const isCustomer = chat.user_id === input.senderId;
    const isAdmin = isAdminRole(profileRole);

    if (!isCustomer && !isAdmin) throw new Error("Forbidden");

    const senderRole: "customer" | "admin" = isCustomer ? "customer" : "admin";

    const message = await this.messagesRepo.insertMessage({
      chatId: input.chatId,
      senderId: input.senderId,
      senderRole,
      body: input.body,
    });

    if (!this.adminSupabase) return message;

    try {
      if (senderRole === "customer") {
        const profilesRepo = new ProfileRepository(this.adminSupabase);
        const staff = await profilesRepo.listStaffProfiles();
        const recipients = staff.filter(
          (admin) => admin.chat_notifications_enabled !== false
        );

        const notifications = new AdminNotificationService(this.adminSupabase);
        await notifications.notifyChatMessage(chat.id, input.body.slice(0, 120));

        await Promise.all(
          recipients.map((admin) =>
            this.chatEmailService.sendChatNotification({
              to: admin.email ?? "",
              chatId: chat.id,
              orderId: chat.order_id ?? null,
              senderRole: "customer",
              message: input.body,
              recipientRole: "admin",
            })
          )
        );
      } else {
        const profilesRepo = new ProfileRepository(this.adminSupabase);
        const customer = await profilesRepo.getByUserId(chat.user_id);
        if (customer?.chat_notifications_enabled && customer.email) {
          await this.chatEmailService.sendChatNotification({
            to: customer.email,
            chatId: chat.id,
            orderId: chat.order_id ?? null,
            senderRole: "admin",
            message: input.body,
            recipientRole: "customer",
          });
        }
      }
    } catch (notifyError) {
      log({
        level: "warn",
        layer: "service",
        message: "chat_notification_failed",
        error: notifyError instanceof Error ? notifyError.message : String(notifyError),
        chatId: chat.id,
      });
    }

    return message;
  }

  async closeChat(chatId: string, closedBy: string) {
    return this.chatsRepo.closeChat(chatId, closedBy);
  }
}
