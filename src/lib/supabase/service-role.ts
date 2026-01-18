// src/lib/supabase/service-role.ts
import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/db/database.types";
import { env } from "@/config/env";

export type AdminSupabaseClient = SupabaseClient<Database>;

let adminClient: AdminSupabaseClient | null = null;

export function createSupabaseAdminClient(): AdminSupabaseClient {
  if (!adminClient) {
    adminClient = createClient<Database>(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.SUPABASE_SECRET_KEY,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      },
    );
  }

  return adminClient;
}
