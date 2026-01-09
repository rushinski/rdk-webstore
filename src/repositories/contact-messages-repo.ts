// src/repositories/contact-messages-repo.ts
import type { TypedSupabaseClient } from "@/lib/supabase/server";
import type { TablesInsert } from "@/types/database.types";

export type ContactMessageInsert = TablesInsert<"contact_messages">;

export class ContactMessagesRepository {
  constructor(private readonly supabase: TypedSupabaseClient) {}

  async insertMessage(message: ContactMessageInsert) {
    const { error } = await this.supabase.from("contact_messages").insert(message);
    if (error) throw error;
  }
}
