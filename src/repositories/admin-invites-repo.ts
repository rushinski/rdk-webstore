// src/repositories/admin-invites-repo.ts
import type { TypedSupabaseClient } from "@/lib/supabase/server";
import type { Tables, TablesInsert } from "@/types/db/database.types";

export type AdminInviteRow = Tables<"admin_invites">;
export type AdminInviteInsert = TablesInsert<"admin_invites">;

export class AdminInvitesRepository {
  constructor(private readonly supabase: TypedSupabaseClient) {}

  async createInvite(input: {
    createdBy: string;
    role: "admin" | "super_admin";
    tokenHash: string;
    expiresAt: string;
  }): Promise<AdminInviteRow> {
    const insert: AdminInviteInsert = {
      created_by: input.createdBy,
      role: input.role,
      token_hash: input.tokenHash,
      expires_at: input.expiresAt,
    };

    const { data, error } = await this.supabase
      .from("admin_invites")
      .insert(insert)
      .select()
      .single();

    if (error) throw error;
    return data as AdminInviteRow;
  }

  async getByTokenHash(tokenHash: string): Promise<AdminInviteRow | null> {
    const { data, error } = await this.supabase
      .from("admin_invites")
      .select("*")
      .eq("token_hash", tokenHash)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  async markUsed(inviteId: string, acceptedBy: string) {
    const { data, error } = await this.supabase
      .from("admin_invites")
      .update({ used_at: new Date().toISOString(), accepted_by: acceptedBy })
      .eq("id", inviteId)
      .select()
      .single();

    if (error) throw error;
    return data as AdminInviteRow;
  }
}
