// src/lib/supabase/client.ts
"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { env } from "@/config/env";

export type TypedSupabaseClient = SupabaseClient<Database>;

export const supabaseBrowserClient: TypedSupabaseClient = createBrowserClient<Database>(
  env.NEXT_PUBLIC_SUPABASE_URL!,
  env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);
