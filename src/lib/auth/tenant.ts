import type { TypedSupabaseClient } from "@/lib/supabase/server";
import type { ServerSession } from "@/lib/auth/session";

const DEFAULT_TENANT_NAME = "Default Tenant";

export async function ensureTenantId(
  session: ServerSession,
  supabase: TypedSupabaseClient
): Promise<string> {
  const existingId = session.profile?.tenant_id;
  if (existingId) return existingId;

  const { data: existingTenant, error: lookupError } = await supabase
    .from("tenants")
    .select("id")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (lookupError) throw lookupError;

  let tenantId = existingTenant?.id;

  if (!tenantId) {
    const tenantName =
      session.profile?.full_name ||
      session.profile?.email ||
      session.user.email ||
      DEFAULT_TENANT_NAME;

    const { data: createdTenant, error: createError } = await supabase
      .from("tenants")
      .insert({ name: tenantName })
      .select("id")
      .single();

    if (createError) throw createError;
    tenantId = createdTenant.id;
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .update({ tenant_id: tenantId })
    .eq("id", session.user.id);

  if (profileError) {
    console.warn("Failed to update profile tenant_id:", profileError);
  }

  return tenantId;
}
