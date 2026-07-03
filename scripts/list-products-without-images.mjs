import { loadEnvConfig } from "@next/env";
import { createClient } from "@supabase/supabase-js";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

function loadEnvironment() {
  loadEnvConfig(process.cwd());
}

export function parseArgs(argv) {
  let tenantId = null;
  let includeArchived = false;
  let json = false;
  let outPath = null;

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (token === "--tenant") {
      const value = argv[index + 1]?.trim();
      if (!value) {
        throw new Error("Missing value for --tenant");
      }
      tenantId = value;
      index += 1;
      continue;
    }

    if (token === "--include-archived") {
      includeArchived = true;
      continue;
    }

    if (token === "--json") {
      json = true;
      continue;
    }

    if (token === "--out") {
      const value = argv[index + 1]?.trim();
      if (!value) {
        throw new Error("Missing value for --out");
      }
      outPath = value;
      index += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${token}`);
  }

  return { tenantId, includeArchived, json, outPath };
}

function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;

  if (!url || !key) {
    throw new Error("Missing Supabase admin env vars.");
  }

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

async function resolveTenantId(supabase, explicitTenantId) {
  if (explicitTenantId) {
    return explicitTenantId;
  }

  const { data, error } = await supabase
    .from("tenants")
    .select("id")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data?.id) {
    throw new Error("Could not resolve a tenant id. Pass --tenant explicitly.");
  }

  return data.id;
}

async function main() {
  loadEnvironment();
  const args = parseArgs(process.argv.slice(2));
  const supabase = createAdminClient();
  const tenantId = await resolveTenantId(supabase, args.tenantId);

  let productQuery = supabase
    .from("products")
    .select("id, name, condition, archived_at")
    .eq("tenant_id", tenantId)
    .eq("is_active", true);

  if (!args.includeArchived) {
    productQuery = productQuery.is("archived_at", null);
  }

  const [{ data: products, error: productError }, { data: images, error: imageError }] =
    await Promise.all([
      productQuery,
      supabase.from("product_images").select("product_id"),
    ]);

  if (productError) {
    throw productError;
  }
  if (imageError) {
    throw imageError;
  }

  const imageProductIds = new Set((images ?? []).map((row) => row.product_id));
  const rows = (products ?? [])
    .filter((product) => !imageProductIds.has(product.id))
    .map((product) => ({
      productId: product.id,
      productName: product.name ?? "Unnamed product",
      condition: typeof product.condition === "string" ? product.condition : "new",
      archivedAt: product.archived_at,
    }))
    .sort((a, b) => a.productName.localeCompare(b.productName));

  const usedRows = rows.filter((row) => row.condition === "used");
  const newRows = rows.filter((row) => row.condition !== "used");

  const outPath =
    args.outPath ??
    (args.json
      ? "tmp/products-without-images.json"
      : "tmp/products-without-images.txt");

  const payload = args.json
    ? JSON.stringify(
        {
          tenantId,
          includeArchived: args.includeArchived,
          count: rows.length,
          newCount: newRows.length,
          usedCount: usedRows.length,
          newProducts: newRows,
          usedProducts: usedRows,
        },
        null,
        2,
      )
    : [
        `NEW (${newRows.length})`,
        ...newRows.map((row) => `${row.productName} | ${row.productId}`),
        "",
        `USED (${usedRows.length})`,
        ...usedRows.map((row) => `${row.productName} | ${row.productId}`),
      ].join("\n");

  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, payload ? `${payload}\n` : "", "utf8");

  process.stdout.write(`Tenant: ${tenantId}\n`);
  process.stdout.write(`Include archived: ${args.includeArchived}\n`);
  process.stdout.write(`Product count: ${rows.length}\n`);
  process.stdout.write(`New product count: ${newRows.length}\n`);
  process.stdout.write(`Used product count: ${usedRows.length}\n`);
  process.stdout.write(`Wrote list: ${outPath}\n`);
}

if (process.env.NODE_ENV !== "test") {
  main().catch((error) => {
    const message =
      error instanceof Error
        ? (error.stack ?? error.message)
        : typeof error === "object" && error !== null
          ? JSON.stringify(error, null, 2)
          : String(error);
    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
  });
}
