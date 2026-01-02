// scripts/import-square-inventory.ts
// How to run (dev first!):
//   ts-node scripts/import-square-inventory.ts <filePath> <tenantId> <userId> [imagesBasePath]
// Checkpoints:
//   1) File exists + extension
//   2) Rows loaded
//   3) SKUs grouped
//   4) Supabase health
//   5) SKU payload preview
//   6) Upsert by SKU (start with ONE SKU for first run)

import { readFile } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { parse as parseCsv } from "csv-parse/sync";
import * as XLSX from "xlsx";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { ProductService } from "@/services/product-service";
import { buildSizeTags } from "@/services/tag-service";

// ---- Types ----

type ImportOptions = {
  filePath: string; // CSV or XLSX from Square
  imagesBasePath?: string; // Local dir or base URL to resolve image filenames
  tenantId: string; // Target tenant
  createdBy: string; // Admin user id for auditing
};

// Normalized row shape from Square export.
// TODO: Adjust these fields to match the actual Square columns in your export.
export type RawSquareRow = {
  sku: string;
  title: string;
  brand?: string;
  model?: string;
  category?: string;
  condition?: string;
  condition_note?: string;
  description?: string;
  shipping_cents?: number;
  price_cents?: number;
  cost_cents?: number;
  quantity?: number;
  size_label?: string;
  image_filename?: string;
};

// Variant input must align with product_variants columns
export type VariantInput = {
  size_type: "shoe" | "clothing" | "custom";
  size_label: string | null;
  price_cents: number;
  stock: number;
  cost_cents?: number | null;
};

// ---- Entry point ----

async function main() {
  const [filePath, tenantId, createdBy, imagesBasePath] = process.argv.slice(2);

  if (!filePath || !tenantId || !createdBy) {
    console.error(
      "Usage: ts-node scripts/import-square-inventory.ts <filePath> <tenantId> <userId> [imagesBasePath]"
    );
    process.exit(1);
  }

  const opts: ImportOptions = {
    filePath,
    imagesBasePath,
    tenantId,
    createdBy,
  };

  console.log("=== Square Inventory Import ===");
  console.log("Options:", opts);

  // Checkpoint 1: confirm file exists and extension is recognized.
  if (!existsSync(opts.filePath)) {
    console.error("[Checkpoint 1 FAILED] File not found:", opts.filePath);
    process.exit(1);
  }
  const ext = path.extname(opts.filePath).toLowerCase();
  if (![".csv", ".xlsx", ".xls"].includes(ext)) {
    console.error("[Checkpoint 1 FAILED] Unsupported file extension:", ext);
    process.exit(1);
  }
  console.log("[Checkpoint 1 OK] File found and extension looks valid:", ext);

  await importSquareInventory(opts);
}

// ---- Core import function ----

export async function importSquareInventory(opts: ImportOptions) {
  // Checkpoint 2: load and normalize rows from Square export.
  const rawRows = await loadRows(opts.filePath);
  console.log(`[Checkpoint 2 OK] Loaded ${rawRows.length} raw rows from file`);

  if (rawRows.length === 0) {
    console.warn("No rows found in file. Aborting.");
    return;
  }

  // Group by SKU so we treat each SKU as a product with possibly multiple variants/images.
  const rowsBySku = groupRowsBySku(rawRows);
  console.log(`[Checkpoint 3 OK] Grouped into ${rowsBySku.size} distinct SKUs`);

  // TODO: For first test, uncomment this to only process ONE SKU:
  // const firstSku = rowsBySku.keys().next().value;
  // const limitedMap = new Map([[firstSku, rowsBySku.get(firstSku)!]]);
  // await upsertSkuBatch(limitedMap, opts);
  // return;

  await upsertSkuBatch(rowsBySku, opts);
}

// ---- DB upsert loop ----

async function upsertSkuBatch(rowsBySku: Map<string, RawSquareRow[]>, opts: ImportOptions) {
  const supabase = createSupabaseAdminClient();
  const service = new ProductService(supabase);

  let createdCount = 0;
  let updatedCount = 0;
  let errorCount = 0;

  // Checkpoint 4: try connecting to Supabase (simple health check).
  const { error: healthError } = await supabase.from("products").select("id").limit(1);
  if (healthError) {
    console.error("[Checkpoint 4 FAILED] Supabase query failed:", healthError.message);
    throw healthError;
  }
  console.log("[Checkpoint 4 OK] Supabase connection works");

  for (const [sku, rows] of rowsBySku.entries()) {
    const trimmedSku = sku?.trim();
    if (!trimmedSku) {
      console.warn("Skipping group with empty SKU");
      continue;
    }

    try {
      const variants = buildVariants(rows);
      const imageUrls = resolveImages(rows, opts.imagesBasePath);

      console.log(
        `[Checkpoint 5] Preparing SKU=${trimmedSku} with ${variants.length} variants and ${imageUrls.length} images`
      );

      const base = rows[0];
      const category = (base.category as any) ?? "sneakers"; // TODO: map to your Category union if needed.
      const condition = (base.condition as any) ?? "new"; // TODO: map to your Condition union if needed.

      const sizeTags = buildSizeTags(variants);
      const tags = [
        base.brand && { label: base.brand, group_key: "brand" },
        base.model && { label: base.model, group_key: "model" },
        ...sizeTags,
      ].filter(Boolean) as { label: string; group_key: string }[];

      const productPayload = {
        title_raw: base.title || `${base.brand ?? ""} ${base.model ?? ""}`.trim(),
        brand_override_id: null,
        model_override_id: null,
        category,
        condition,
        condition_note: base.condition_note,
        description: base.description,
        shipping_override_cents: base.shipping_cents,
        variants,
        images: imageUrls.map((url, idx) => ({
          url,
          sort_order: idx,
          is_primary: idx === 0,
        })),
        tags,
        // TODO: After adding SKU override support to ProductService + ProductRepository,
        // uncomment to enforce Square SKU:
        // sku: trimmedSku,
      };

      // Checkpoint 6: check if a product already exists for this SKU in DB.
      const existing = await supabase
        .from("products")
        .select("id")
        .eq("sku", trimmedSku)
        .maybeSingle();

      if (existing.error) {
        throw existing.error;
      }

      if (existing.data?.id) {
        console.log(`Updating existing product for SKU=${trimmedSku}, id=${existing.data.id}`);
        await service.updateProduct(existing.data.id, productPayload as any, {
          userId: opts.createdBy,
          tenantId: opts.tenantId,
        });
        updatedCount++;
      } else {
        console.log(`Creating new product for SKU=${trimmedSku}`);
        await service.createProduct(productPayload as any, {
          userId: opts.createdBy,
          tenantId: opts.tenantId,
          // TODO: optionally pass marketplaceId/sellerId if needed for this tenant.
        });
        createdCount++;
      }
    } catch (err: any) {
      errorCount++;
      console.error(`Error processing SKU=${sku}:`, err?.message ?? err);
    }
  }

  console.log("=== Import Summary ===");
  console.log("Products created:", createdCount);
  console.log("Products updated:", updatedCount);
  console.log("Errors:", errorCount);
}

// ---- File loading / normalization ----

// Checkpoint 2 implementation: read file and map to RawSquareRow[]
export async function loadRows(filePath: string): Promise<RawSquareRow[]> {
  const ext = path.extname(filePath).toLowerCase();

  if (ext === ".csv") {
    const buf = await readFile(filePath);
    const text = buf.toString("utf-8");

    const records: any[] = parseCsv(text, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    // TODO: Map actual CSV column names -> RawSquareRow fields.
    return records.map((r) => normalizeSquareRow(r));
  }

  // XLSX / XLS
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const json: any[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });

  // TODO: Map actual XLSX column names -> RawSquareRow fields.
  return json.map((r) => normalizeSquareRow(r));
}

// Map your Square export columns into our RawSquareRow structure.
export function normalizeSquareRow(r: any): RawSquareRow {
  // TODO: Replace these with your real column keys from Square export.
  const row: RawSquareRow = {
    sku: String(r["SKU"] ?? "").trim(),
    title: String(r["Name"] ?? "").trim(),
    brand: r["Brand"] ? String(r["Brand"]).trim() : undefined,
    model: r["Model"] ? String(r["Model"]).trim() : undefined,
    category: r["Category"] ? String(r["Category"]).trim() : undefined,
    condition: r["Condition"] ? String(r["Condition"]).trim() : undefined,
    condition_note: undefined,
    description: r["Description"] ? String(r["Description"]).trim() : undefined,
    shipping_cents: r["Shipping"] ? Math.round(Number(r["Shipping"]) * 100) : undefined,
    price_cents: r["Price"] ? Math.round(Number(r["Price"]) * 100) : undefined,
    cost_cents: r["Cost"] ? Math.round(Number(r["Cost"]) * 100) : undefined,
    quantity: r["Quantity"] != null ? Number(r["Quantity"]) : undefined,
    size_label: r["Size"] ? String(r["Size"]).trim() : undefined,
    image_filename: r["ImageFilename"] ? String(r["ImageFilename"]).trim() : undefined,
  };

  return row;
}

// ---- Helpers: grouping, variants, images ----

export function groupRowsBySku(rows: RawSquareRow[]): Map<string, RawSquareRow[]> {
  const map = new Map<string, RawSquareRow[]>();
  for (const row of rows) {
    if (!row.sku) continue;
    if (!map.has(row.sku)) {
      map.set(row.sku, []);
    }
    map.get(row.sku)!.push(row);
  }
  return map;
}

export function buildVariants(rows: RawSquareRow[]): VariantInput[] {
  const variants: VariantInput[] = [];

  for (const row of rows) {
    if (!row.price_cents) {
      console.warn(`Row with SKU=${row.sku} missing price_cents; skipping variant`);
      continue;
    }

    variants.push({
      size_type: deriveSizeType(row),
      size_label: row.size_label ?? null,
      price_cents: row.price_cents,
      stock: row.quantity ?? 0,
      cost_cents: row.cost_cents ?? null,
    });
  }

  if (variants.length === 0) {
    console.warn(
      `No valid variants built for SKU=${rows[0]?.sku}; consider providing a default variant`
    );
  }

  return variants;
}

export function deriveSizeType(row: RawSquareRow): VariantInput["size_type"] {
  // Basic mapper; refine as needed.
  const category = (row.category || "").toLowerCase();
  if (category.includes("hoodie") || category.includes("shirt") || category.includes("tee")) {
    return "clothing";
  }
  if (category.includes("custom")) {
    return "custom";
  }
  return "shoe"; // default for sneakers
}

function resolveImages(rows: RawSquareRow[], imagesBasePath?: string): string[] {
  const filenames = Array.from(
    new Set(rows.map((r) => r.image_filename).filter((name): name is string => !!name))
  );

  if (!imagesBasePath) {
    return filenames; // assume filenames are already full URLs
  }

  return filenames.map((name) =>
    imagesBasePath.endsWith("/") ? `${imagesBasePath}${name}` : `${imagesBasePath}/${name}`
  );
}

// ---- Run if executed directly ----

if (require.main === module) {
  main().catch((err) => {
    console.error("Fatal import error:", err);
    process.exit(1);
  });
}
