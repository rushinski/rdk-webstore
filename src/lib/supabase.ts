// src/lib/supabase.ts

import { createClient } from "@supabase/supabase-js";

import { env } from "@/config/env";

import { logError } from "./log";

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
      },
    );

    return client;
  } catch (err) {
    logError(err, {
      layer: "infra",
      message: "Failed to initialize RLS Supabase client",
      requestId,
      event: "supabase_rls_init_failed",
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
      env.SUPABASE_DB_URL!,
      env.SUPABASE_SERVICE_ROLE_KEY!, // server only
      {
        global: {
          headers: {
            ...(requestId ? { "x-request-id": requestId } : {}),
          },
        },
      },
    );

    return client;
  } catch (err) {
    logError(err, {
      layer: "infra",
      message: "Failed to initialize admin Supabase client",
      requestId,
      event: "supabase_admin_init_failed",
    });
    throw err;
  }
}
