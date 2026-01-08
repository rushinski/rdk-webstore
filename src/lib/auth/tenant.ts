// src/lib/auth/tenant.ts
import type { TypedSupabaseClient } from "@/lib/supabase/server";
import type { ServerSession } from "@/lib/auth/session";
import { TenantService } from "@/services/tenant-service";

export async function ensureTenantId(
  session: ServerSession,
  supabase: TypedSupabaseClient
): Promise<string> {
  const service = new TenantService(supabase);
  return service.ensureTenantId(session);
}
