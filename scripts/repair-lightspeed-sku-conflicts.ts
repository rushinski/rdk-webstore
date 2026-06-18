import { loadEnvConfig } from "@next/env";
import { readFileSync } from "node:fs";

loadEnvConfig(process.cwd());

type ParsedArgs = {
  tenantId: string | null;
  filePath: string | null;
  skus: string[];
  apply: boolean;
  json: boolean;
};

type ProductLinkSummary = {
  id: string;
  externalSku: string;
  syncState: string;
  lightspeedProductId: string | null;
  lightspeedVariantId: string | null;
  tombstonedAt: string | null;
  lastError: string | null;
};

type ProductVariantSummary = {
  id: string;
  sku: string;
  sizeLabel: string;
  stock: number;
  sortOrder: number;
};

type ProductSummary = {
  id: string;
  name: string;
  brand: string;
  category: string;
  condition: string;
  isActive: boolean;
  isOutOfStock: boolean;
  archivedAt: string | null;
  goLiveAt: string | null;
  variants: ProductVariantSummary[];
  links: ProductLinkSummary[];
};

export type RepairInspection = {
  sku: string;
  products: ProductSummary[];
};

export type RepairPlan =
  | {
      sku: string;
      status: "ready_to_move";
      reason: "single_archived_orphan_to_single_linked_target";
      sourceProductId: string;
      sourceVariantId: string;
      targetProductId: string;
      targetSortOrder: number;
    }
  | {
      sku: string;
      status: "skipped";
      reason:
        | "missing_sku"
        | "multiple_source_owners"
        | "source_has_links"
        | "source_not_archived"
        | "no_linked_target"
        | "multiple_linked_targets"
        | "target_already_has_sku";
    };

type RepairExecutionResult =
  | (RepairPlan & { action: "dry_run" })
  | (Extract<RepairPlan, { status: "ready_to_move" }> & {
      action: "applied";
      sourceProductVariantCountAfter: number;
      targetProductVariantCountAfter: number;
    })
  | Extract<RepairPlan, { status: "skipped" }>;

export function extractSkusFromText(input: string) {
  const matches = input.match(/SKU:\s*(.+)$/gim) ?? [];
  return [...new Set(matches.map((line) => line.replace(/^SKU:\s*/i, "").trim()).filter(Boolean))];
}

export function parseArgs(argv: string[]): ParsedArgs {
  const skus: string[] = [];
  let tenantId: string | null = null;
  let filePath: string | null = null;
  let apply = false;
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

    if (token === "--file") {
      const value = argv[index + 1]?.trim();
      if (!value) {
        throw new Error("Missing value for --file");
      }
      filePath = value;
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

    if (token === "--apply") {
      apply = true;
      continue;
    }

    if (token === "--json") {
      json = true;
      continue;
    }

    throw new Error(`Unknown argument: ${token}`);
  }

  return {
    tenantId,
    filePath,
    skus,
    apply,
    json,
  };
}

export function planRepair(inspection: RepairInspection): RepairPlan {
  const sourceOwners = inspection.products.filter((product) =>
    product.variants.some((variant) => variant.sku === inspection.sku),
  );

  if (sourceOwners.length === 0) {
    return { sku: inspection.sku, status: "skipped", reason: "missing_sku" };
  }

  if (sourceOwners.length > 1) {
    return { sku: inspection.sku, status: "skipped", reason: "multiple_source_owners" };
  }

  const sourceProduct = sourceOwners[0];
  const sourceVariant = sourceProduct.variants.find((variant) => variant.sku === inspection.sku);

  if (!sourceVariant) {
    return { sku: inspection.sku, status: "skipped", reason: "missing_sku" };
  }

  if (sourceProduct.links.length > 0) {
    return { sku: inspection.sku, status: "skipped", reason: "source_has_links" };
  }

  if (!sourceProduct.archivedAt) {
    return { sku: inspection.sku, status: "skipped", reason: "source_not_archived" };
  }

  const strictLinkedTargets = inspection.products.filter(
    (product) =>
      product.id !== sourceProduct.id &&
      product.links.length > 0 &&
      product.name === sourceProduct.name &&
      product.brand === sourceProduct.brand &&
      product.category === sourceProduct.category &&
      product.condition === sourceProduct.condition,
  );

  const linkedTargets =
    strictLinkedTargets.length > 0
      ? strictLinkedTargets
      : inspection.products.filter(
          (product) =>
            product.id !== sourceProduct.id &&
            product.links.length > 0 &&
            product.name === sourceProduct.name &&
            product.brand === sourceProduct.brand &&
            product.category === sourceProduct.category,
        );

  if (linkedTargets.length === 0) {
    return { sku: inspection.sku, status: "skipped", reason: "no_linked_target" };
  }

  if (linkedTargets.length > 1) {
    return { sku: inspection.sku, status: "skipped", reason: "multiple_linked_targets" };
  }

  const targetProduct = linkedTargets[0];
  if (targetProduct.variants.some((variant) => variant.sku === inspection.sku)) {
    return { sku: inspection.sku, status: "skipped", reason: "target_already_has_sku" };
  }

  const targetSortOrder =
    targetProduct.variants.reduce((max, variant) => Math.max(max, variant.sortOrder), -1) + 1;

  return {
    sku: inspection.sku,
    status: "ready_to_move",
    reason: "single_archived_orphan_to_single_linked_target",
    sourceProductId: sourceProduct.id,
    sourceVariantId: sourceVariant.id,
    targetProductId: targetProduct.id,
    targetSortOrder,
  };
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

function normalizeProductText(value: string | null | undefined) {
  return value?.trim() ?? "";
}

async function inspectSku(tenantId: string, sku: string): Promise<RepairInspection> {
  const { createSupabaseAdminClient } = await import("@/lib/supabase/service-role");

  const supabase = createSupabaseAdminClient();
  const normalizedSku = sku.trim();

  const { data: directVariants, error: directVariantsError } = await supabase
    .from("product_variants")
    .select("id, product_id")
    .eq("tenant_id", tenantId)
    .eq("sku", normalizedSku);

  if (directVariantsError) {
    throw directVariantsError;
  }

  const { data: directLinks, error: directLinksError } = await supabase
    .from("lightspeed_product_links")
    .select("id, product_id")
    .eq("tenant_id", tenantId)
    .eq("external_sku", normalizedSku);

  if (directLinksError) {
    throw directLinksError;
  }

  const sourceProductIds = Array.from(
    new Set(
      [
        ...(directVariants ?? []).map((row) => row.product_id),
        ...(directLinks ?? [])
          .map((row) => row.product_id)
          .filter((value): value is string => typeof value === "string"),
      ].filter((value): value is string => typeof value === "string"),
    ),
  );

  const { data: directProducts, error: directProductsError } = sourceProductIds.length
    ? await supabase
        .from("products")
        .select("id, name, brand, category, condition")
        .eq("tenant_id", tenantId)
        .in("id", sourceProductIds)
    : { data: [], error: null };

  if (directProductsError) {
    throw directProductsError;
  }

  const relatedProductsBySignature = new Map<string, string>();
  const relatedProductsByRelaxedSignature = new Map<string, string>();
  for (const product of directProducts ?? []) {
    const strictKey = [
      normalizeProductText(product.name),
      normalizeProductText(product.brand),
      normalizeProductText(product.category),
      normalizeProductText(product.condition),
    ].join("\u0000");
    const relaxedKey = [
      normalizeProductText(product.name),
      normalizeProductText(product.brand),
      normalizeProductText(product.category),
    ].join("\u0000");
    relatedProductsBySignature.set(strictKey, strictKey);
    relatedProductsByRelaxedSignature.set(relaxedKey, relaxedKey);
  }

  const relatedProducts: Array<{
    id: string;
    name: string | null;
    brand: string | null;
    category: string | null;
    condition: string | null;
    is_active: boolean;
    is_out_of_stock: boolean;
    archived_at: string | null;
    go_live_at: string | null;
  }> = [];

  for (const signature of relatedProductsBySignature.keys()) {
    const [name, brand, category, condition] = signature.split("\u0000");
    const { data, error } = await supabase
      .from("products")
      .select(
        "id, name, brand, category, condition, is_active, is_out_of_stock, archived_at, go_live_at",
      )
      .eq("tenant_id", tenantId)
      .eq("name", name)
      .eq("brand", brand)
      .eq("category", category)
      .eq("condition", condition);

    if (error) {
      throw error;
    }

    relatedProducts.push(...(data ?? []));
  }

  for (const signature of relatedProductsByRelaxedSignature.keys()) {
    const [name, brand, category] = signature.split("\u0000");
    const { data, error } = await supabase
      .from("products")
      .select(
        "id, name, brand, category, condition, is_active, is_out_of_stock, archived_at, go_live_at",
      )
      .eq("tenant_id", tenantId)
      .eq("name", name)
      .eq("brand", brand)
      .eq("category", category);

    if (error) {
      throw error;
    }

    relatedProducts.push(...(data ?? []));
  }

  const allProductIds = Array.from(new Set(relatedProducts.map((product) => product.id)));
  if (allProductIds.length === 0) {
    return { sku: normalizedSku, products: [] };
  }

  const [variantResult, linkResult] = await Promise.all([
    supabase
      .from("product_variants")
      .select("id, product_id, sku, size_label, stock, sort_order")
      .eq("tenant_id", tenantId)
      .in("product_id", allProductIds)
      .order("sort_order", { ascending: true }),
    supabase
      .from("lightspeed_product_links")
      .select(
        "id, product_id, external_sku, sync_state, lightspeed_product_id, lightspeed_variant_id, tombstoned_at, last_error",
      )
      .eq("tenant_id", tenantId)
      .in("product_id", allProductIds),
  ]);

  if (variantResult.error) {
    throw variantResult.error;
  }
  if (linkResult.error) {
    throw linkResult.error;
  }

  const variantsByProductId = new Map<string, ProductVariantSummary[]>();
  for (const row of variantResult.data ?? []) {
    const list = variantsByProductId.get(row.product_id) ?? [];
    list.push({
      id: row.id,
      sku: row.sku,
      sizeLabel: row.size_label,
      stock: row.stock,
      sortOrder: row.sort_order,
    });
    variantsByProductId.set(row.product_id, list);
  }

  const linksByProductId = new Map<string, ProductLinkSummary[]>();
  for (const row of linkResult.data ?? []) {
    if (!row.product_id) {
      continue;
    }
    const list = linksByProductId.get(row.product_id) ?? [];
    list.push({
      id: row.id,
      externalSku: row.external_sku,
      syncState: row.sync_state,
      lightspeedProductId: row.lightspeed_product_id,
      lightspeedVariantId: row.lightspeed_variant_id,
      tombstonedAt: row.tombstoned_at,
      lastError: row.last_error,
    });
    linksByProductId.set(row.product_id, list);
  }

  const uniqueProducts = Array.from(
    new Map(relatedProducts.map((product) => [product.id, product])).values(),
  );

  return {
    sku: normalizedSku,
    products: uniqueProducts.map((product) => ({
      id: product.id,
      name: normalizeProductText(product.name),
      brand: normalizeProductText(product.brand),
      category: normalizeProductText(product.category),
      condition: normalizeProductText(product.condition),
      isActive: product.is_active,
      isOutOfStock: product.is_out_of_stock,
      archivedAt: product.archived_at,
      goLiveAt: product.go_live_at,
      variants: variantsByProductId.get(product.id) ?? [],
      links: linksByProductId.get(product.id) ?? [],
    })),
  };
}

async function applyRepairPlan(
  tenantId: string,
  inspection: RepairInspection,
  plan: Extract<RepairPlan, { status: "ready_to_move" }>,
): Promise<RepairExecutionResult> {
  const { createSupabaseAdminClient } = await import("@/lib/supabase/service-role");
  const { ProductRepository } = await import("@/repositories/product-repo");

  const supabase = createSupabaseAdminClient();
  const productRepo = new ProductRepository(supabase);
  const sourceProduct = inspection.products.find((product) => product.id === plan.sourceProductId);
  const targetProduct = inspection.products.find((product) => product.id === plan.targetProductId);

  if (!sourceProduct || !targetProduct) {
    return { sku: plan.sku, status: "skipped", reason: "missing_sku" };
  }

  await productRepo.updateVariant(plan.sourceVariantId, {
    product_id: plan.targetProductId,
    sort_order: plan.targetSortOrder,
  });

  const movedVariant = sourceProduct.variants.find((variant) => variant.id === plan.sourceVariantId);
  const sourceVariantsAfter = sourceProduct.variants.filter(
    (variant) => variant.id !== plan.sourceVariantId,
  );
  const targetVariantsAfter = movedVariant
    ? [...targetProduct.variants, { ...movedVariant, sortOrder: plan.targetSortOrder }]
    : [...targetProduct.variants];

  await productRepo.update(plan.sourceProductId, {
    is_out_of_stock: sourceVariantsAfter.every((variant) => variant.stock <= 0),
  });
  await productRepo.update(plan.targetProductId, {
    is_out_of_stock: targetVariantsAfter.every((variant) => variant.stock <= 0),
  });

  return {
    ...plan,
    action: "applied",
    sourceProductVariantCountAfter: sourceVariantsAfter.length,
    targetProductVariantCountAfter: targetVariantsAfter.length,
  };
}

function loadSkusFromArgs(args: ParsedArgs) {
  const fromFile = args.filePath
    ? extractSkusFromText(readFileSync(args.filePath, "utf8"))
    : [];
  return [...new Set([...args.skus, ...fromFile].map((sku) => sku.trim()).filter(Boolean))];
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const skus = loadSkusFromArgs(args);
  if (skus.length === 0) {
    throw new Error(
      "Usage: tsx scripts/repair-lightspeed-sku-conflicts.ts (--sku <value> | --file <path>) [--sku <value>] [--tenant <id>] [--apply] [--json]",
    );
  }

  const tenantId = await resolveTenantId(args.tenantId);
  const inspections = await Promise.all(skus.map((sku) => inspectSku(tenantId, sku)));
  const plans = inspections.map((inspection) => ({
    inspection,
    plan: planRepair(inspection),
  }));

  const results: RepairExecutionResult[] = [];
  for (const item of plans) {
    if (item.plan.status !== "ready_to_move") {
      results.push(item.plan);
      continue;
    }

    if (!args.apply) {
      results.push({ ...item.plan, action: "dry_run" });
      continue;
    }

    results.push(await applyRepairPlan(tenantId, item.inspection, item.plan));
  }

  if (args.json) {
    console.info(
      JSON.stringify(
        {
          tenantId,
          apply: args.apply,
          skuCount: skus.length,
          results,
        },
        null,
        2,
      ),
    );
    return;
  }

  console.info(`Tenant: ${tenantId}`);
  console.info(`Mode: ${args.apply ? "apply" : "dry-run"}`);
  console.info(`SKU count: ${skus.length}`);
  for (const result of results) {
    if (result.status === "ready_to_move") {
      console.info(
        `${result.action === "applied" ? "APPLIED" : "READY"} ${result.sku} source=${result.sourceProductId} target=${result.targetProductId}`,
      );
      continue;
    }

    console.info(`SKIPPED ${result.sku} reason=${result.reason}`);
  }
}

if (process.argv[1]?.includes("repair-lightspeed-sku-conflicts.ts")) {
  main().catch((error) => {
    const message = error instanceof Error ? (error.stack ?? error.message) : String(error);
    console.error(message);
    process.exitCode = 1;
  });
}
