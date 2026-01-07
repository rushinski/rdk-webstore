import { Client } from "pg";
import { createAdminClient } from "./supabase";

const connectionString = process.env.SUPABASE_DB_URL ?? "";

export async function resetDatabase(): Promise<void> {
  if (!connectionString) {
    throw new Error("SUPABASE_DB_URL is required for database resets.");
  }

  const client = new Client({ connectionString });
  await client.connect();

  const tables = [
    "public.admin_notifications",
    "public.chat_messages",
    "public.chats",
    "public.order_items",
    "public.order_shipping",
    "public.orders",
    "public.product_images",
    "public.product_tags",
    "public.product_variants",
    "public.products",
    "public.tags",
    "public.shipping_defaults",
    "public.shipping_carriers",
    "public.shipping_origins",
    "public.shipping_profiles",
    "public.site_pageviews",
    "public.contact_messages",
    "public.email_subscription_tokens",
    "public.email_subscribers",
    "public.stripe_events",
    "public.user_addresses",
    "public.admin_invites",
    "public.payout_settings",
    "public.catalog_candidates",
    "public.marketplaces",
    "public.sellers",
    "public.tenants",
    "public.profiles",
    "auth.users",
  ];

  try {
    await client.query("begin");
    await client.query(`truncate table ${tables.join(", ")} restart identity cascade`);
    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    await client.end();
  }
}

export async function seedBaseData() {
  const admin = createAdminClient();

  const { data: tenantRows, error: tenantError } = await admin
    .from("tenants")
    .insert({ name: "Test Tenant" })
    .select("id")
    .single();

  if (tenantError) throw tenantError;

  const tenantId = tenantRows.id as string;

  const { data: marketplaceRows, error: marketplaceError } = await admin
    .from("marketplaces")
    .insert({ tenant_id: tenantId, name: "Test Marketplace" })
    .select("id")
    .single();

  if (marketplaceError) throw marketplaceError;

  const marketplaceId = marketplaceRows.id as string;

  const categories = ["sneakers", "clothing", "accessories", "electronics"];
  const defaultsPayload = categories.map((category) => ({
    tenant_id: tenantId,
    category,
    shipping_cost_cents: 995,
    default_weight_oz: 16,
    default_length_in: 12,
    default_width_in: 12,
    default_height_in: 12,
  }));

  const { error: defaultsError } = await admin
    .from("shipping_defaults")
    .insert(defaultsPayload);

  if (defaultsError) throw defaultsError;

  return { tenantId, marketplaceId };
}
