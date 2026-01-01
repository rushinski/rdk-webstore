// src/repositories/chat-messages-repo.ts
import type { TypedSupabaseClient } from "@/lib/supabase/server";
import type { Tables, TablesInsert } from "@/types/database.types";

export type ChatMessageRow = Tables<"chat_messages">;
export type ChatMessageInsert = TablesInsert<"chat_messages">;

export class ChatMessagesRepository {
  constructor(private readonly supabase: TypedSupabaseClient) {}

  async listByChatId(chatId: string): Promise<ChatMessageRow[]> {
    const { data, error } = await this.supabase
      .from("chat_messages")
      .select("*")
      .eq("chat_id", chatId)
      .order("created_at", { ascending: true });

    if (error) throw error;
    return data ?? [];
  }

  async insertMessage(input: {
    chatId: string;
    senderId?: string | null;
    senderRole: "customer" | "admin";
    body: string;
  }): Promise<ChatMessageRow> {
    const insert: ChatMessageInsert = {
      chat_id: input.chatId,
      sender_id: input.senderId ?? null,
      sender_role: input.senderRole,
      body: input.body,
    };

    const { data, error } = await this.supabase
      .from("chat_messages")
      .insert(insert)
      .select()
      .single();

    if (error) throw error;
    return data as ChatMessageRow;
  }
}
