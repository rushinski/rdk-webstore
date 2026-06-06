import { createServerClient } from "@supabase/ssr";
import type { NextRequest } from "next/server";

import { env } from "@/config/env";
import type { Database } from "@/types/db/database.types";

export function createSupabaseProxyClient(request: NextRequest) {
  return createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll() {
          // Proxy reads are enough for current auth/lock checks.
        },
      },
    },
  );
}
