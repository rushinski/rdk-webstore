import { loadEnvConfig } from "@next/env";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

loadEnvConfig(process.cwd());

function writeLine(value: string) {
  process.stdout.write(`${value}\n`);
}

type ParsedArgs = {
  tenantId: string | null;
  json: boolean;
  includeArchived: boolean;
  outPath: string | null;
};

type ResultRow = {
  productId: string;
  productName: string;
  sku: string;
  archivedAt: string | null;
};

export function parseArgs(argv: string[]): ParsedArgs {
  let tenantId: string | null = null;
  let json = false;
  let includeArchived = false;
  let outPath: string | null = null;

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

    if (token === "--json") {
      json = true;
      continue;
    }

    if (token === "--include-archived") {
      includeArchived = true;
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

  return { tenantId, json, includeArchived, outPath };
}

async function resolveTenantId(explicitTenantId: string | null) {
  if (explicitTenantId) {
    return explicitTenantId;
  }

  const { createSupabaseAdminClient } = await import("@/lib/supabase/service-role");
  const { TenantRepository } = await import("@/repositories/tenant-repo");

  const supabase = createSupabaseAdminClient();
  const tenantRepo = new TenantRepository(supabase);
  const tenantId = await tenantRepo.getFirstTenantId();

  if (!tenantId) {
    throw new Error("Could not resolve a tenant id. Pass --tenant explicitly.");
  }

  return tenantId;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const tenantId = await resolveTenantId(args.tenantId);
  const { createSupabaseAdminClient } = await import("@/lib/supabase/service-role");

  const supabase = createSupabaseAdminClient();

  let productQuery = supabase
    .from("products")
    .select("id, name, archived_at")
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
  const productsWithoutImages = (products ?? []).filter(
    (product) => !imageProductIds.has(product.id),
  );

  const productIds = productsWithoutImages.map((product) => product.id);
  const { data: variants, error: variantError } = productIds.length
    ? await supabase
        .from("product_variants")
        .select("product_id, sku")
        .eq("tenant_id", tenantId)
        .in("product_id", productIds)
        .order("sku", { ascending: true })
    : { data: [], error: null };

  if (variantError) {
    throw variantError;
  }

  const productById = new Map(
    productsWithoutImages.map((product) => [
      product.id,
      { productName: product.name, archivedAt: product.archived_at },
    ]),
  );

  const rows: ResultRow[] = (variants ?? [])
    .map((variant) => {
      const product = productById.get(variant.product_id);
      if (!product || !variant.sku?.trim()) {
        return null;
      }

      return {
        productId: variant.product_id,
        productName: product.productName ?? "Unnamed product",
        sku: variant.sku.trim(),
        archivedAt: product.archivedAt,
      };
    })
    .filter((row): row is ResultRow => Boolean(row));

  const outputPayload = args.json
    ? JSON.stringify(
        {
          tenantId,
          includeArchived: args.includeArchived,
          count: rows.length,
          skus: rows,
        },
        null,
        2,
      )
    : rows.map((row) => `${row.sku} | ${row.productName} | ${row.productId}`).join("\n");

  const outPath =
    args.outPath ??
    (args.json
      ? "tmp/products-without-images.json"
      : "tmp/products-without-images.txt");
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, outputPayload ? `${outputPayload}\n` : "", "utf8");

  if (args.json) {
    writeLine(`Tenant: ${tenantId}`);
    writeLine(`Include archived: ${args.includeArchived}`);
    writeLine(`SKU count: ${rows.length}`);
    writeLine(`Wrote JSON: ${outPath}`);
    return;
  }

  writeLine(`Tenant: ${tenantId}`);
  writeLine(`Include archived: ${args.includeArchived}`);
  writeLine(`SKU count: ${rows.length}`);
  writeLine(`Wrote list: ${outPath}`);
}

if (process.env.NODE_ENV !== "test") {
  main().catch((error) => {
    const message = error instanceof Error ? (error.stack ?? error.message) : String(error);
    console.error(message);
    process.exitCode = 1;
  });
}
