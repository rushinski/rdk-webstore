// src/lib/supabase/public.ts
import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/db/database.types";
import { env } from "@/config/env";

export type TypedSupabaseClient = SupabaseClient<Database>;

let publicClient: TypedSupabaseClient | null = null;

export function createSupabasePublicClient(): TypedSupabaseClient {
  if (!publicClient) {
    publicClient = createClient<Database>(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      },
    );
  }

  return publicClient;
}
