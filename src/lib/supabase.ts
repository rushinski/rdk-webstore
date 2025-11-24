// src/lib/supabase.ts

import { createClient } from "@supabase/supabase-js";
import { logError } from "./log";
import { env } from "@/config/env";

/**
 * This creates a Supabase client that respects RLS and user access tokens.
 * Use this in API routes and server actions.
 */
export function createRlsClient(accessToken?: string, requestId?: string) {
  try {
    const client = createClient(
      env.NEXT_PUBLIC_SUPABASE_URL!,
      env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
            ...(requestId ? { "x-request-id": requestId } : {}),
          },
        },
      }
    );

    return client;
  } catch (err) {
    logError(err, {
      event: "supabase_rls_init_failed",
      requestId
    });
    throw err;
  }
}

/**
 * Service role client (NO RLS).
 * Use ONLY in:
 *  - Stripe webhook
 *  - Admin-only jobs
 *  - Data migrations or admin scripts
 */
export function createAdminClient(requestId?: string) {
  try {
    const client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!, // server only
      {
        global: {
          headers: {
            ...(requestId ? { "x-request-id": requestId } : {})
          },
        },
      }
    );

    return client;
  } catch (err) {
    logError(err, {
      event: "supabase_admin_init_failed",
      requestId
    });
    throw err;
  }
}
