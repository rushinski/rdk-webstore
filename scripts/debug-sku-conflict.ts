import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

type ParsedArgs = {
  tenantId: string | null;
  skus: string[];
  json: boolean;
};

type SkuConflictReport = {
  sku: string;
  variantMatchCount: number;
  linkMatchCount: number;
  productCount: number;
  inferredState:
    | "missing_everywhere"
    | "variant_only"
    | "link_only"
    | "single_product_match"
    | "multi_product_conflict";
  variantMatches: Array<{
    id: string;
    productId: string;
    sizeLabel: string | null;
    stock: number;
    createdAt: string;
    updatedAt: string;
  }>;
  linkMatches: Array<{
    id: string;
    productId: string | null;
    variantId: string | null;
    lightspeedProductId: string | null;
    lightspeedVariantId: string | null;
    lightspeedFamilyId: string | null;
    externalSku: string;
    syncState: string;
    tombstonedAt: string | null;
    lastError: string | null;
  }>;
  products: Array<{
    id: string;
    name: string;
    brand: string;
    category: string;
    condition: string;
    isActive: boolean;
    isOutOfStock: boolean;
    archivedAt: string | null;
    goLiveAt: string | null;
    variantCount: number;
    variants: Array<{
      id: string;
      sku: string;
      sizeLabel: string;
      stock: number;
    }>;
    links: Array<{
      id: string;
      externalSku: string;
      syncState: string;
      lightspeedProductId: string | null;
      lightspeedVariantId: string | null;
      tombstonedAt: string | null;
      lastError: string | null;
    }>;
  }>;
};

export function parseArgs(argv: string[]): ParsedArgs {
  const skus: string[] = [];
  let tenantId: string | null = null;
  let json = false;

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (token === "--sku") {
      const value = argv[index + 1]?.trim();
      if (!value) {
        throw new Error("Missing value for --sku");
      }
      skus.push(value);
      index += 1;
      continue;
    }

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

    throw new Error(`Unknown argument: ${token}`);
  }

  if (skus.length === 0) {
    throw new Error(
      "Usage: tsx scripts/debug-sku-conflict.ts --sku <value> [--sku <value>] [--tenant <id>] [--json]",
    );
  }

  return { tenantId, skus, json };
}

function inferState(report: Omit<SkuConflictReport, "inferredState">): SkuConflictReport["inferredState"] {
  if (report.variantMatchCount === 0 && report.linkMatchCount === 0) {
    return "missing_everywhere";
  }

  if (report.variantMatchCount > 0 && report.productCount === 1) {
    return "single_product_match";
  }

  if (report.variantMatchCount > 0 && report.productCount > 1) {
    return "multi_product_conflict";
  }

  if (report.variantMatchCount > 0) {
    return "variant_only";
  }

  return "link_only";
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

async function buildReport(tenantId: string, sku: string): Promise<SkuConflictReport> {
  const { createSupabaseAdminClient } = await import("@/lib/supabase/service-role");

  const supabase = createSupabaseAdminClient();
  const normalizedSku = sku.trim();

  const [variantResult, linkResult] = await Promise.all([
    supabase
      .from("product_variants")
      .select("id, product_id, sku, size_label, stock, created_at, updated_at")
      .eq("tenant_id", tenantId)
      .eq("sku", normalizedSku),
    supabase
      .from("lightspeed_product_links")
      .select(
        "id, product_id, variant_id, lightspeed_product_id, lightspeed_variant_id, lightspeed_family_id, external_sku, sync_state, tombstoned_at, last_error",
      )
      .eq("tenant_id", tenantId)
      .eq("external_sku", normalizedSku),
  ]);

  if (variantResult.error) {
    throw variantResult.error;
  }
  if (linkResult.error) {
    throw linkResult.error;
  }

  const variantMatches = (variantResult.data ?? []).map((row) => ({
    id: row.id,
    productId: row.product_id,
    sizeLabel: row.size_label,
    stock: row.stock,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));

  const linkMatches = (linkResult.data ?? []).map((row) => ({
    id: row.id,
    productId: row.product_id,
    variantId: row.variant_id,
    lightspeedProductId: row.lightspeed_product_id,
    lightspeedVariantId: row.lightspeed_variant_id,
    lightspeedFamilyId: row.lightspeed_family_id,
    externalSku: row.external_sku,
    syncState: row.sync_state,
    tombstonedAt: row.tombstoned_at,
    lastError: row.last_error,
  }));

  const productIds = Array.from(
    new Set(
      [
        ...variantMatches.map((row) => row.productId),
        ...linkMatches.map((row) => row.productId).filter((value): value is string => Boolean(value)),
      ].filter((value): value is string => Boolean(value)),
    ),
  );

  let products: SkuConflictReport["products"] = [];

  if (productIds.length > 0) {
    const [productResult, siblingVariantResult, productLinkResult] = await Promise.all([
      supabase
        .from("products")
        .select(
          "id, name, brand, category, condition, is_active, is_out_of_stock, archived_at, go_live_at",
        )
        .eq("tenant_id", tenantId)
        .in("id", productIds),
      supabase
        .from("product_variants")
        .select("id, product_id, sku, size_label, stock")
        .eq("tenant_id", tenantId)
        .in("product_id", productIds)
        .order("sort_order", { ascending: true }),
      supabase
        .from("lightspeed_product_links")
        .select(
          "id, product_id, external_sku, sync_state, lightspeed_product_id, lightspeed_variant_id, tombstoned_at, last_error",
        )
        .eq("tenant_id", tenantId)
        .in("product_id", productIds),
    ]);

    if (productResult.error) {
      throw productResult.error;
    }
    if (siblingVariantResult.error) {
      throw siblingVariantResult.error;
    }
    if (productLinkResult.error) {
      throw productLinkResult.error;
    }

    const siblingVariantsByProductId = new Map<
      string,
      Array<(typeof siblingVariantResult.data)[number]>
    >();
    for (const row of siblingVariantResult.data ?? []) {
      const list = siblingVariantsByProductId.get(row.product_id) ?? [];
      list.push(row);
      siblingVariantsByProductId.set(row.product_id, list);
    }

    const linksByProductId = new Map<string, Array<(typeof productLinkResult.data)[number]>>();
    for (const row of productLinkResult.data ?? []) {
      if (!row.product_id) {
        continue;
      }
      const list = linksByProductId.get(row.product_id) ?? [];
      list.push(row);
      linksByProductId.set(row.product_id, list);
    }

    products = (productResult.data ?? []).map((row) => {
      const variants = siblingVariantsByProductId.get(row.id) ?? [];
      const links = linksByProductId.get(row.id) ?? [];

      return {
        id: row.id,
        name: row.name,
        brand: row.brand,
        category: row.category,
        condition: row.condition,
        isActive: row.is_active,
        isOutOfStock: row.is_out_of_stock,
        archivedAt: row.archived_at,
        goLiveAt: row.go_live_at,
        variantCount: variants.length,
        variants: variants.map((variant) => ({
          id: variant.id,
          sku: variant.sku,
          sizeLabel: variant.size_label,
          stock: variant.stock,
        })),
        links: links.map((link) => ({
          id: link.id,
          externalSku: link.external_sku,
          syncState: link.sync_state,
          lightspeedProductId: link.lightspeed_product_id,
          lightspeedVariantId: link.lightspeed_variant_id,
          tombstonedAt: link.tombstoned_at,
          lastError: link.last_error,
        })),
      };
    });
  }

  const partialReport = {
    sku: normalizedSku,
    variantMatchCount: variantMatches.length,
    linkMatchCount: linkMatches.length,
    productCount: products.length,
    variantMatches,
    linkMatches,
    products,
  };

  return {
    ...partialReport,
    inferredState: inferState(partialReport),
  };
}

function formatReport(report: SkuConflictReport) {
  const lines: string[] = [];

  lines.push(`SKU ${report.sku}`);
  lines.push(`  inferredState: ${report.inferredState}`);
  lines.push(`  variantMatches: ${report.variantMatchCount}`);
  lines.push(`  linkMatches: ${report.linkMatchCount}`);
  lines.push(`  productMatches: ${report.productCount}`);

  if (report.variantMatches.length > 0) {
    lines.push("  directVariantRows:");
    for (const row of report.variantMatches) {
      lines.push(
        `    - variant=${row.id} product=${row.productId} size=${row.sizeLabel ?? "null"} stock=${row.stock}`,
      );
    }
  }

  if (report.linkMatches.length > 0) {
    lines.push("  directLinkRows:");
    for (const row of report.linkMatches) {
      lines.push(
        `    - link=${row.id} product=${row.productId ?? "null"} variant=${row.variantId ?? "null"} state=${row.syncState} lsProduct=${row.lightspeedProductId ?? "null"} lsVariant=${row.lightspeedVariantId ?? "null"} tombstoned=${row.tombstonedAt ?? "null"}`,
      );
    }
  }

  if (report.products.length > 0) {
    lines.push("  matchedProducts:");
    for (const product of report.products) {
      lines.push(
        `    - product=${product.id} active=${product.isActive} archived=${product.archivedAt ?? "null"} outOfStock=${product.isOutOfStock} goLiveAt=${product.goLiveAt ?? "null"} name=${product.name}`,
      );
      lines.push(
        `      brand=${product.brand} category=${product.category} condition=${product.condition} variants=${product.variantCount} links=${product.links.length}`,
      );
      for (const variant of product.variants) {
        lines.push(
          `      variant ${variant.id}: sku=${variant.sku} size=${variant.sizeLabel} stock=${variant.stock}`,
        );
      }
      for (const link of product.links) {
        lines.push(
          `      link ${link.id}: externalSku=${link.externalSku} state=${link.syncState} lsProduct=${link.lightspeedProductId ?? "null"} lsVariant=${link.lightspeedVariantId ?? "null"} tombstoned=${link.tombstonedAt ?? "null"}`,
        );
      }
    }
  }

  return lines.join("\n");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const tenantId = await resolveTenantId(args.tenantId);
  const reports = await Promise.all(args.skus.map((sku) => buildReport(tenantId, sku)));

  if (args.json) {
    console.info(
      JSON.stringify(
        {
          tenantId,
          reports,
        },
        null,
        2,
      ),
    );
    return;
  }

  console.info(`Tenant: ${tenantId}`);
  for (const report of reports) {
    console.info(formatReport(report));
  }
}

if (process.argv[1]?.includes("debug-sku-conflict.ts")) {
  main().catch((error) => {
    const message = error instanceof Error ? (error.stack ?? error.message) : String(error);
    console.error(message);
    process.exitCode = 1;
  });
}
