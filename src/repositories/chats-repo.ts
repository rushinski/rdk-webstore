// src/repositories/chats-repo.ts
import type { TypedSupabaseClient } from "@/lib/supabase/server";
import type { Tables, TablesInsert, TablesUpdate } from "@/types/database.types";

export type ChatRow = Tables<"chats">;
export type ChatInsert = TablesInsert<"chats">;
export type ChatUpdate = TablesUpdate<"chats">;

export class ChatsRepository {
  constructor(private readonly supabase: TypedSupabaseClient) {}

  async getById(chatId: string): Promise<ChatRow | null> {
    const { data, error } = await this.supabase
      .from("chats")
      .select("*")
      .eq("id", chatId)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  async getOpenChatForUser(userId: string): Promise<ChatRow | null> {
    const { data, error } = await this.supabase
      .from("chats")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "open")
      .order("created_at", { ascending: false })
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  async createChat(input: {
    userId?: string | null;
    orderId?: string | null;
    source: "manual" | "order";
    guestEmail?: string | null;
  }): Promise<ChatRow> {
    const insert: ChatInsert = {
      user_id: input.userId ?? null,
      order_id: input.orderId ?? null,
      guest_email: input.guestEmail ?? null,
      source: input.source,
      status: "open",
    };

    const { data, error } = await this.supabase
      .from("chats")
      .insert(insert)
      .select()
      .single();

    if (error) throw error;
    return data as ChatRow;
  }

  async getByOrderId(orderId: string): Promise<ChatRow | null> {
    const { data, error } = await this.supabase
      .from("chats")
      .select("*")
      .eq("order_id", orderId)
      .order("created_at", { ascending: false })
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  async updateGuestEmail(chatId: string, guestEmail: string | null): Promise<ChatRow> {
    const { data, error } = await this.supabase
      .from("chats")
      .update({ guest_email: guestEmail })
      .eq("id", chatId)
      .select()
      .single();

    if (error) throw error;
    return data as ChatRow;
  }

  async closeChat(chatId: string, closedBy?: string | null): Promise<ChatRow> {
    const { data, error } = await this.supabase
      .from("chats")
      .update({
        status: "closed",
        closed_at: new Date().toISOString(),
        closed_by: closedBy ?? null,
      } as ChatUpdate)
      .eq("id", chatId)
      .select()
      .single();

    if (error) throw error;
    return data as ChatRow;
  }

  async listAdminChats(params?: { status?: "open" | "closed" }) {
    let query = this.supabase
      .from("chats")
      .select("*, messages:chat_messages(id, body, sender_role, created_at), customer:profiles(email)")
      .order("updated_at", { ascending: false })
      .order("created_at", { foreignTable: "chat_messages", ascending: false })
      .limit(1, { foreignTable: "chat_messages" });

    if (params?.status) {
      query = query.eq("status", params.status);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
  }
}
