import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import ExcelJS from "exceljs";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/session";
import { ensureTenantId } from "@/lib/auth/tenant";
import { ProductService, type ProductCreateInput } from "@/services/product-service";
import { ProductTitleParserService } from "@/services/product-title-parser-service";
import { buildSizeTags, type TagInputItem } from "@/services/tag-service";
import { SHOE_SIZES, CLOTHING_SIZES } from "@/config/constants/sizes";
import { getRequestIdFromHeaders } from "@/lib/http/request-id";
import { log, logError } from "@/lib/log";
import type { Category, Condition, SizeType } from "@/types/views/product";

export const runtime = "nodejs";

const CATEGORY_VALUES = ["sneakers", "clothing", "accessories", "electronics"] as const;
const CONDITION_VALUES = ["new", "used"] as const;

const importOptionsSchema = z
  .object({
    defaultCategory: z.enum(CATEGORY_VALUES).default("sneakers"),
    condition: z.enum(CONDITION_VALUES).default("new"),
    useSquareCategory: z.enum(["true", "false"]).default("true"),
  })
  .strict();

const normalizeHeader = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "");

const normalizeRow = (row: Record<string, unknown>) => {
  const normalized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    const normalizedKey = normalizeHeader(key);
    if (!normalizedKey) continue;
    normalized[normalizedKey] = value;
  }
  return normalized;
};

const findValue = (row: Record<string, unknown>, keys: string[]) => {
  for (const key of keys) {
    const value = row[key];
    if (value === null || value === undefined) continue;
    if (typeof value === "string" && value.trim() === "") continue;
    return value;
  }
  return null;
};

const findValueByFragment = (row: Record<string, unknown>, fragment: string) => {
  const match = Object.entries(row).find(([key, value]) => {
    if (!key.includes(fragment)) return false;
    if (value === null || value === undefined) return false;
    if (typeof value === "string" && value.trim() === "") return false;
    return true;
  });
  return match?.[1] ?? null;
};

const parseMoneyToCents = (value: unknown) => {
  if (value === null || value === undefined) return null;
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.round(value * 100);
  }
  const cleaned = String(value).replace(/[^0-9.-]+/g, "").trim();
  if (!cleaned) return null;
  const parsed = Number.parseFloat(cleaned);
  if (!Number.isFinite(parsed)) return null;
  return Math.round(parsed * 100);
};

const parseStockCount = (value: unknown) => {
  if (value === null || value === undefined) return null;
  const cleaned = String(value).replace(/[^0-9.-]+/g, "").trim();
  if (!cleaned) return null;
  const parsed = Number.parseFloat(cleaned);
  if (!Number.isFinite(parsed)) return null;
  return Math.max(0, Math.round(parsed));
};

const resolveCategory = (value: unknown, fallback: Category) => {
  if (!value) return fallback;
  const normalized = String(value).toLowerCase();
  if (normalized.includes("sneaker") || normalized.includes("shoe") || normalized.includes("kick")) {
    return "sneakers";
  }
  if (
    normalized.includes("clothing") ||
    normalized.includes("apparel") ||
    normalized.includes("tee") ||
    normalized.includes("hoodie") ||
    normalized.includes("shirt") ||
    normalized.includes("pant") ||
    normalized.includes("short") ||
    normalized.includes("jacket")
  ) {
    return "clothing";
  }
  if (
    normalized.includes("access") ||
    normalized.includes("bag") ||
    normalized.includes("hat") ||
    normalized.includes("cap") ||
    normalized.includes("sock")
  ) {
    return "accessories";
  }
  if (
    normalized.includes("electronic") ||
    normalized.includes("tech") ||
    normalized.includes("device")
  ) {
    return "electronics";
  }
  return fallback;
};

const resolveCondition = (value: unknown, fallback: Condition) => {
  if (!value) return fallback;
  const normalized = String(value).toLowerCase();
  if (normalized.includes("used") || normalized.includes("pre-owned")) return "used";
  if (normalized.includes("new")) return "new";
  return fallback;
};

const resolveSizeType = (category: Category): SizeType => {
  if (category === "sneakers") return "shoe";
  if (category === "clothing") return "clothing";
  if (category === "accessories") return "custom";
  return "none";
};

const normalizeSizeToken = (value: string) =>
  value
    .toUpperCase()
    .replace(/\s+/g, "")
    .replace(/[–—-]+/g, "/");

const SHOE_SIZE_MAP = new Map<string, string>();
const SHOE_TOKEN_MAP = new Map<string, string>();

for (const size of SHOE_SIZES) {
  const normalized = normalizeSizeToken(size);
  SHOE_SIZE_MAP.set(normalized, size);
  const tokens = size.split("/").map((token) => normalizeSizeToken(token.trim()));
  tokens.forEach((token) => {
    if (!SHOE_TOKEN_MAP.has(token)) {
      SHOE_TOKEN_MAP.set(token, size);
    }
  });
}

const CLOTHING_ALIASES = new Map<string, string>([
  ["S", "SMALL"],
  ["M", "MEDIUM"],
  ["L", "LARGE"],
  ["XL", "XL"],
  ["XXL", "2XL"],
  ["XXXL", "3XL"],
]);

const extractShoeSizeLabel = (inputs: Array<string | null | undefined>) => {
  const combined = inputs.filter(Boolean).join(" ");
  if (!combined) return null;
  const normalized = normalizeSizeToken(combined);
  for (const [key, size] of SHOE_SIZE_MAP) {
    if (normalized.includes(key)) return size;
  }

  const tokenMatches = combined.match(/\b\d{1,2}(?:\.\d)?\s*[MYW]\b/gi) ?? [];
  for (const token of tokenMatches) {
    const normalizedToken = normalizeSizeToken(token);
    const mapped = SHOE_TOKEN_MAP.get(normalizedToken);
    if (mapped) return mapped;
  }
  return null;
};

const extractClothingSizeLabel = (inputs: Array<string | null | undefined>) => {
  const combined = inputs.filter(Boolean).join(" ").toUpperCase();
  if (!combined) return null;

  for (const size of CLOTHING_SIZES) {
    const regex = new RegExp(`\\b${size}\\b`, "i");
    if (regex.test(combined)) return size;
  }

  for (const [alias, target] of CLOTHING_ALIASES) {
    const regex = new RegExp(`\\b${alias}\\b`, "i");
    if (regex.test(combined)) return target;
  }

  return null;
};

const extractSizeLabel = (sizeType: SizeType, inputs: Array<string | null | undefined>) => {
  if (sizeType === "shoe") return extractShoeSizeLabel(inputs);
  if (sizeType === "clothing") return extractClothingSizeLabel(inputs);
  if (sizeType === "custom") {
    const first = inputs.find((value) => value && value.trim());
    return first ? first.trim() : "One Size";
  }
  return "N/A";
};

const buildImportTags = (
  parsed: Awaited<ReturnType<ProductTitleParserService["parseTitle"]>>,
  category: Category,
  condition: Condition,
  variants: ProductCreateInput["variants"]
): TagInputItem[] => {
  const tags: TagInputItem[] = [];

  if (parsed.brand.label) {
    tags.push({ label: parsed.brand.label, group_key: "brand" });
    if (parsed.brand.groupKey === "designer") {
      tags.push({ label: parsed.brand.label, group_key: "designer_brand" });
    }
  }

  if (parsed.model.label && category === "sneakers") {
    tags.push({ label: parsed.model.label, group_key: "model" });
  }

  tags.push({ label: category, group_key: "category" });
  tags.push({ label: condition, group_key: "condition" });
  tags.push(...buildSizeTags(variants));

  return tags;
};

type VariantDraft = ProductCreateInput["variants"][number];

type ProductDraft = {
  titleRaw: string;
  description?: string;
  category: Category;
  condition: Condition;
  imageUrl?: string | null;
  variants: VariantDraft[];
};

const ITEM_NAME_KEYS = ["itemname", "name", "productname", "item"];
const VARIATION_KEYS = ["variationname", "variation", "variantname", "size", "optionname"];
const DESCRIPTION_KEYS = ["description", "itemdescription", "desc"];
const CATEGORY_KEYS = ["category", "itemcategory", "reportingcategory", "department", "collection"];
const PRICE_KEYS = ["price", "priceusd", "price(usd)", "priceamount"];
const COST_KEYS = ["cost", "costusd", "costperitem", "costamount"];
const QUANTITY_KEYS = [
  "currentquantity",
  "quantity",
  "stock",
  "inventory",
  "currentinventory",
  "onhand",
  "qty",
];
const IMAGE_KEYS = [
  "imageurl",
  "imageurl1",
  "imageurl2",
  "imageurl3",
  "image1",
  "image2",
  "photo",
  "photo1",
  "image",
];
const CONDITION_KEYS = ["condition", "itemcondition"];

export async function POST(request: NextRequest) {
  const requestId = getRequestIdFromHeaders(request.headers);

  try {
    const session = await requireAdmin();
    const supabase = await createSupabaseServerClient();
    const tenantId = await ensureTenantId(session, supabase);
    const service = new ProductService(supabase);
    const parser = new ProductTitleParserService(supabase);

    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Missing Square export file.", requestId },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    const optionsParsed = importOptionsSchema.safeParse({
      defaultCategory: formData.get("defaultCategory") ?? "sneakers",
      condition: formData.get("condition") ?? "new",
      useSquareCategory: formData.get("useSquareCategory") ?? "true",
    });

    if (!optionsParsed.success) {
      return NextResponse.json(
        { error: "Invalid form fields", issues: optionsParsed.error.format(), requestId },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    const defaultCategory = optionsParsed.data.defaultCategory as Category;
    const defaultCondition = optionsParsed.data.condition as Condition;
    const useSquareCategory = optionsParsed.data.useSquareCategory !== "false";

    const buffer = await file.arrayBuffer();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(Buffer.from(buffer));
    const sheet = workbook.worksheets[0];
    if (!sheet) {
      return NextResponse.json(
        { error: "No worksheet found in file.", requestId },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    const headerRow = sheet.getRow(1);
    const headerValues = (headerRow.values as unknown[]).slice(1);
    const headers = headerValues.map((value) =>
      value === null || value === undefined ? "" : String(value).trim()
    );

    const rows: Record<string, unknown>[] = [];
    sheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
      if (rowNumber === 1) return;
      const values = (row.values as unknown[]).slice(1);
      const record: Record<string, unknown> = {};
      headers.forEach((header, index) => {
        if (!header) return;
        record[header] = values[index] ?? "";
      });
      rows.push(record);
    });

    const drafts = new Map<string, ProductDraft>();
    const errors: string[] = [];
    let skipped = 0;

    rows.forEach((row, index) => {
      const normalizedRow = normalizeRow(row);
      const rowNumber = index + 2;

      const titleRawValue = findValue(normalizedRow, ITEM_NAME_KEYS);
      const titleRaw = titleRawValue ? String(titleRawValue).trim() : "";
      if (!titleRaw) {
        skipped += 1;
        errors.push(`Row ${rowNumber}: missing item name.`);
        return;
      }

      const categoryValue = useSquareCategory
        ? findValue(normalizedRow, CATEGORY_KEYS) ?? findValueByFragment(normalizedRow, "category")
        : null;
      const category = resolveCategory(categoryValue, defaultCategory);
      const conditionValue = findValue(normalizedRow, CONDITION_KEYS);
      const condition = resolveCondition(conditionValue, defaultCondition);

      const priceValue =
        findValue(normalizedRow, PRICE_KEYS) ?? findValueByFragment(normalizedRow, "price");
      const priceCents = parseMoneyToCents(priceValue);
      if (priceCents === null) {
        skipped += 1;
        errors.push(`Row ${rowNumber}: missing price for "${titleRaw}".`);
        return;
      }

      const costValue =
        findValue(normalizedRow, COST_KEYS) ?? findValueByFragment(normalizedRow, "cost");
      const costCents = parseMoneyToCents(costValue) ?? 0;

      const quantityValue =
        findValue(normalizedRow, QUANTITY_KEYS) ?? findValueByFragment(normalizedRow, "quantity");
      const stock = parseStockCount(quantityValue) ?? 0;

      const variationValue = findValue(normalizedRow, VARIATION_KEYS);
      const descriptionValue = findValue(normalizedRow, DESCRIPTION_KEYS);
      const description = descriptionValue ? String(descriptionValue).trim() : undefined;

      const sizeType = resolveSizeType(category);
      const sizeLabelCandidate =
        sizeType === "none"
          ? "N/A"
          : extractSizeLabel(sizeType, [
              variationValue ? String(variationValue) : null,
              titleRaw,
              description,
            ]);
      let sizeLabel = sizeType === "none" ? "N/A" : (sizeLabelCandidate ?? "");
      if (!sizeLabel && variationValue) {
        sizeLabel = String(variationValue).trim();
      }
      if (!sizeLabel && sizeType !== "none") {
        sizeLabel = "One Size";
      }

      const imageValue =
        findValue(normalizedRow, IMAGE_KEYS) ?? findValueByFragment(normalizedRow, "imageurl");
      const imageUrl = imageValue ? String(imageValue).trim() : null;

      const draftKey = `${titleRaw.toLowerCase()}|${category}`;
      const existing = drafts.get(draftKey);
      if (!existing) {
        drafts.set(draftKey, {
          titleRaw,
          description,
          category,
          condition,
          imageUrl,
          variants: [
            {
              size_type: sizeType,
              size_label: sizeLabel,
              price_cents: priceCents,
              cost_cents: costCents,
              stock,
            },
          ],
        });
      } else {
        if (!existing.description && description) {
          existing.description = description;
        }
        if (!existing.imageUrl && imageUrl) {
          existing.imageUrl = imageUrl;
        }
        const match = existing.variants.find(
          (variant) => variant.size_type === sizeType && variant.size_label === sizeLabel
        );
        if (match) {
          match.stock += stock;
          match.price_cents = Math.max(match.price_cents, priceCents);
          match.cost_cents = Math.max(match.cost_cents ?? 0, costCents ?? 0);
        } else {
          existing.variants.push({
            size_type: sizeType,
            size_label: sizeLabel,
            price_cents: priceCents,
            cost_cents: costCents,
            stock,
          });
        }
      }
    });

    let created = 0;

    for (const draft of drafts.values()) {
      if (draft.variants.length === 0) {
        skipped += 1;
        errors.push(`Skipping "${draft.titleRaw}" because it has no variants.`);
        continue;
      }

      try {
        const parsed = await parser.parseTitle({
          titleRaw: draft.titleRaw,
          category: draft.category,
          tenantId,
        });

        const tags = buildImportTags(parsed, draft.category, draft.condition, draft.variants);

        const input: ProductCreateInput = {
          title_raw: draft.titleRaw,
          category: draft.category,
          condition: draft.condition,
          description: draft.description || undefined,
          variants: draft.variants,
          images: [
            {
              url: draft.imageUrl || "/placeholder.png",
              sort_order: 0,
              is_primary: true,
            },
          ],
          tags,
        };

        await service.createProduct(input, {
          userId: session.user.id,
          tenantId,
          marketplaceId: null,
          sellerId: null,
        });
        created += 1;
      } catch (error) {
        log({
          level: "warn",
          layer: "api",
          message: "square_import_create_error",
          requestId,
          titleRaw: draft.titleRaw,
          error: error instanceof Error ? error.message : String(error),
        });
        errors.push(`Failed to import "${draft.titleRaw}".`);
      }
    }

    return NextResponse.json({
      created,
      skipped,
      errors,
      totalRows: rows.length,
      totalProducts: drafts.size,
      requestId,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    logError(error, {
      layer: "api",
      requestId,
      route: "/api/admin/inventory/import/square",
    });
    return NextResponse.json(
      { error: "Failed to import Square inventory.", requestId },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
