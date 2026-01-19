// src/repositories/contact-messages-repo.ts
import type { TypedSupabaseClient } from "@/lib/supabase/server";
import type { TablesInsert } from "@/types/db/database.types";

export type ContactMessageInsert = TablesInsert<"contact_messages">;

export class ContactMessagesRepository {
  constructor(private readonly supabase: TypedSupabaseClient) {}

  async insertMessage(message: ContactMessageInsert) {
    const { data, error } = await this.supabase
      .from("contact_messages")
      .insert(message)
      .select("id")
      .single();

    if (error) throw error;
    return data.id as string;
  }

  async setAttachments(params: { id: string; attachments: unknown }) {
    const { error } = await this.supabase
      .from("contact_messages")
      .update({ attachments: params.attachments as any })
      .eq("id", params.id);

    if (error) throw error;
  }
}
