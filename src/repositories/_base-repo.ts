// src/repositories/_base-repo.ts

import type { SupabaseClient } from "@supabase/supabase-js"; // Client passed by RLS or service-role
import type { Database } from "@/types/database.types";      // Ensures all types are properly formated e.g. table & column names

/**
 * Base class that all repositories extend.
 *
 * Responsibilities:
 * - Provide typed Supabase client (RLS or Admin)
 * - Carry request-scoped metadata (requestId, userId, tenantId)
 * - Enforce consistent query patterns for all repos
 */
export class BaseRepo {
  protected supabase: SupabaseClient<Database>; // DB connection our repo uses
  protected requestId?: string;
  protected userId?: string | null;
  protected tenantId?: string | null;

  constructor(options: {
    supabase: SupabaseClient<Database>;
    requestId?: string;
    userId?: string | null;
    tenantId?: string | null;
  }) {
    this.supabase = options.supabase;
    this.requestId = options.requestId;
    this.userId = options.userId ?? null;
    this.tenantId = options.tenantId ?? null;
  }

  /**
   * For debugging or structured logging inside repos.
   */
  protected context() {
    return {
      requestId: this.requestId,
      userId: this.userId,
      tenantId: this.tenantId,
    };
  }
}
