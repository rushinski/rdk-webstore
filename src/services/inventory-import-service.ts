import crypto from "crypto";
import ExcelJS from "exceljs";
import type { TypedSupabaseClient } from "@/lib/supabase/server";
import { ProductRepository } from "@/repositories/product-repo";
import { InventoryImportRepository } from "@/repositories/inventory-import-repo";
import { ProductService, type ProductCreateInput } from "@/services/product-service";
import { ProductTitleParserService } from "@/services/product-title-parser-service";
import { buildSizeTags, upsertTags, type TagInputItem } from "@/services/tag-service";
import { SHOE_SIZES, CLOTHING_SIZES } from "@/config/constants/sizes";
import type { Category, Condition, SizeType } from "@/types/views/product";
import type { TablesInsert } from "@/types/database.types";

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ALLOWED_EXTENSION = ".xlsx";

const ITEMS_SHEET = "Items";
const COMPONENT_SHEET = "Component Inventory";

const ITEMS_HEADERS = [
  "Reference Handle",
  "Token",
  "Item Name",
  "Variation Name",
  "SKU",
  "Description",
  "Categories",
  "Reporting Category",
  "SEO Title",
  "SEO Description",
  "Permalink",
  "GTIN",
  "Square Online Item Visibility",
  "Item Type",
  "Weight (lb)",
  "Social Media Link Title",
  "Social Media Link Description",
  "Shipping Enabled",
  "Self-serve Ordering Enabled",
  "Delivery Enabled",
  "Pickup Enabled",
  "Price",
  "Online Sale Price",
  "Archived",
  "Sellable",
  "Contains Alcohol",
  "Stockable",
  "Skip Detail Screen in POS",
  "Option Name 1",
  "Option Value 1",
  "Default Unit Cost",
  "Default Vendor Name",
  "Default Vendor Code",
  "Current Quantity PIckup Location (NOT A STORE)",
  "New Quantity PIckup Location (NOT A STORE)",
  "Stock Alert Enabled PIckup Location (NOT A STORE)",
  "Stock Alert Count PIckup Location (NOT A STORE)",
];

const COMPONENT_HEADERS = [
  "Token (locked)",
  "Item Name (locked)",
  "Variation Name (locked)",
  "Unit and Precision (locked)",
  "SKU (locked)",
  "Reference Handle",
  "Stock-by Reference Handle",
  "Sell-by Equivalent",
  "Stock-by Equivalent",
];

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

type SheetName = typeof ITEMS_SHEET | typeof COMPONENT_SHEET;

type ImportRowError = {
  sheet: SheetName;
  rowNumber: number;
  message: string;
};

type ParsedItemRow = {
  rowNumber: number;
  rawRow: Record<string, unknown>;
  referenceHandle: string | null;
  token: string | null;
  itemName: string | null;
  variationName: string | null;
  sku: string | null;
  description: string | null;
  categories: string | null;
  reportingCategory: string | null;
  price: number | null;
  onlineSalePrice: number | null;
  archived: string | null;
  itemType: string | null;
  visibility: string | null;
  skipDetail: string | null;
  optionName1: string | null;
  optionValue1: string | null;
  defaultUnitCost: number | null;
  currentQuantity: number | null;
  errors: string[];
};

type ParsedComponentRow = {
  rowNumber: number;
  rawRow: Record<string, unknown>;
  token: string | null;
  itemName: string | null;
  variationName: string | null;
  errors: string[];
};

class InventoryImportValidationError extends Error {
  status: number;
  issues?: ImportRowError[];

  constructor(message: string, issues?: ImportRowError[]) {
    super(message);
    this.status = 400;
    this.issues = issues;
  }
}

const normalizeCell = (value: unknown): string | number | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }
  const asString = String(value).trim();
  return asString ? asString : null;
};

const parseText = (value: unknown): string | null => {
  const normalized = normalizeCell(value);
  if (normalized === null) return null;
  return typeof normalized === "number" ? String(normalized) : normalized;
};

const parseNumber = (value: unknown): number | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const cleaned = String(value).replace(/[^0-9.-]+/g, "").trim();
  if (!cleaned) return null;
  const parsed = Number.parseFloat(cleaned);
  if (!Number.isFinite(parsed)) return null;
  return parsed;
};

const parseMoneyToCents = (value: unknown): number | null => {
  const parsed = parseNumber(value);
  if (parsed === null) return null;
  return Math.round(parsed * 100);
};

const parseInteger = (value: unknown): number | null => {
  const parsed = parseNumber(value);
  if (parsed === null) return null;
  return Math.max(0, Math.round(parsed));
};

const getWorksheetRows = (sheet: ExcelJS.Worksheet): unknown[][] => {
  const values = sheet.getSheetValues() as unknown[][];
  return values.slice(1).map((row) => (Array.isArray(row) ? row.slice(1) : []));
};

const normalizeHeaderRow = (row: unknown[]): string[] =>
  row.map((cell) => (cell === null || cell === undefined ? "" : String(cell).trim()));

const normalizeHeaderKey = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "");

const stripTrailingEmpty = (row: string[]): string[] => {
  const trimmed = [...row];
  while (trimmed.length > 0 && !trimmed[trimmed.length - 1]) {
    trimmed.pop();
  }
  return trimmed;
};

const buildHeaderIndexMap = (row: string[], expected: string[]) => {
  const normalizedRow = row.map((value) => normalizeHeaderKey(value));
  const normalizedExpected = expected.map((value) => normalizeHeaderKey(value));
  const indexByKey = new Map<string, number>();
  normalizedRow.forEach((key, index) => {
    if (!key || indexByKey.has(key)) return;
    indexByKey.set(key, index);
  });

  const indexMap = new Map<string, number>();
  const missing: string[] = [];
  let lastIndex = -1;
  let outOfOrder = false;

  normalizedExpected.forEach((key, idx) => {
    const actualIndex = indexByKey.get(key);
    if (actualIndex === undefined) {
      missing.push(expected[idx]);
      return;
    }
    if (actualIndex < lastIndex) {
      outOfOrder = true;
    }
    lastIndex = actualIndex;
    indexMap.set(expected[idx], actualIndex);
  });

  return { indexMap, missing, outOfOrder };
};

const findHeaderRowIndex = (rows: unknown[][], requiredTokens: string[]): number | null => {
  const maxIndex = Math.min(rows.length - 1, 4);
  for (let i = 0; i <= maxIndex; i += 1) {
    const row = rows[i] ?? [];
    const normalized = row.map((cell) => normalizeHeaderKey(String(cell ?? "")));
    const matches = requiredTokens.every((token) =>
      normalized.some((cell) => cell.includes(normalizeHeaderKey(token)))
    );
    if (matches) return i;
  }
  return null;
};

const buildRowRecord = (header: string[], row: unknown[], indexMap: Map<string, number>) => {
  const record: Record<string, unknown> = {};
  header.forEach((key) => {
    const index = indexMap.get(key);
    record[key] = normalizeCell(index === undefined ? null : row[index]);
  });
  return record;
};

const isRowEmpty = (row: unknown[]) =>
  row.every((cell) => {
    if (cell === null || cell === undefined) return true;
    if (typeof cell === "string") return cell.trim() === "";
    return false;
  });

const normalizeCategoryLabel = (value: string) =>
  value
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();

const CATEGORY_ROOTS = new Set(["sneakers", "clothing", "accessories", "electronics"]);

const mapCategoryFromText = (value: string): Category | null => {
  const combined = value.toLowerCase();
  if (combined.includes("sneaker") || combined.includes("shoe") || combined.includes("kick")) {
    return "sneakers";
  }
  if (
    combined.includes("clothing") ||
    combined.includes("apparel") ||
    combined.includes("tee") ||
    combined.includes("hoodie") ||
    combined.includes("shirt") ||
    combined.includes("pant") ||
    combined.includes("short") ||
    combined.includes("jacket")
  ) {
    return "clothing";
  }
  if (
    combined.includes("access") ||
    combined.includes("bag") ||
    combined.includes("hat") ||
    combined.includes("cap") ||
    combined.includes("sock")
  ) {
    return "accessories";
  }
  if (combined.includes("electronic") || combined.includes("tech") || combined.includes("device")) {
    return "electronics";
  }
  return null;
};

const resolveCategory = (
  categoryPaths: string[],
  inputs: Array<string | null | undefined>
): Category | null => {
  if (categoryPaths.length > 0) {
    const rootCandidate = categoryPaths[0].split(/[>/]/)[0]?.trim();
    if (rootCandidate) {
      const normalizedRoot = normalizeCategoryLabel(rootCandidate);
      if (CATEGORY_ROOTS.has(normalizedRoot)) return normalizedRoot as Category;
      return mapCategoryFromText(normalizedRoot);
    }
  }

  const combined = inputs.filter(Boolean).join(" ");
  return mapCategoryFromText(combined);
};

const resolveCondition = (inputs: Array<string | null | undefined>): Condition | null => {
  const combined = inputs.filter(Boolean).join(" ").toLowerCase();
  if (combined.includes("used") || combined.includes("pre-owned") || combined.includes("preowned")) {
    return "used";
  }
  if (combined.includes("new")) return "new";
  return null;
};

const resolveSizeType = (category: Category): SizeType => {
  if (category === "sneakers") return "shoe";
  if (category === "clothing") return "clothing";
  if (category === "accessories") return "custom";
  return "none";
};

const parseCategoryPaths = (value: string | null) => {
  if (!value) return [];
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
};

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

const normalizeTitleKey = (value: string) => value.trim().toLowerCase();

const buildImportTags = (
  parsed: Awaited<ReturnType<ProductTitleParserService["parseTitle"]>>,
  category: Category,
  condition: Condition,
  variants: ProductCreateInput["variants"],
  categoryPaths: string[]
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

  categoryPaths.forEach((path) => {
    tags.push({ label: path, group_key: "category_path" });
  });

  return tags;
};

const buildImportRowLog = (
  base: {
    importId: string;
    sheetName: SheetName;
    rowNumber: number;
    token?: string | null;
    referenceHandle?: string | null;
    rawRow: Record<string, unknown>;
  },
  status: string,
  error?: string | null
): TablesInsert<"inventory_import_rows"> => ({
  import_id: base.importId,
  sheet_name: base.sheetName,
  row_number: base.rowNumber,
  token: base.token ?? null,
  reference_handle: base.referenceHandle ?? null,
  status,
  error: error ?? null,
  raw_row: base.rawRow,
});

const parseItemsSheet = (
  sheet: ExcelJS.Worksheet
): { rows: ParsedItemRow[]; errors: ImportRowError[]; rowsParsed: number } => {
  const rows = getWorksheetRows(sheet);
  const headerIndex = findHeaderRowIndex(rows, ["Token", "Item Name"]);
  if (headerIndex === null) {
    throw new InventoryImportValidationError("Missing header row in Items sheet.");
  }

  const headerRow = stripTrailingEmpty(normalizeHeaderRow(rows[headerIndex] ?? []));
  const { indexMap, missing, outOfOrder } = buildHeaderIndexMap(headerRow, ITEMS_HEADERS);
  if (missing.length > 0 || outOfOrder) {
    const details: string[] = [];
    if (missing.length > 0) details.push(`Missing headers: ${missing.join(", ")}`);
    if (outOfOrder) details.push("Header order does not match the expected schema.");
    const message = details.length > 0
      ? `Items sheet headers do not match the required schema. ${details.join(" ")}`
      : "Items sheet headers do not match the required schema.";
    throw new InventoryImportValidationError(message, [
      { sheet: ITEMS_SHEET, rowNumber: headerIndex + 1, message },
    ]);
  }

  const parsedRows: ParsedItemRow[] = [];
  const errors: ImportRowError[] = [];
  let rowsParsed = 0;

  for (let i = headerIndex + 1; i < rows.length; i += 1) {
    const row = rows[i] ?? [];
    if (isRowEmpty(row)) continue;

    rowsParsed += 1;
    const rowNumber = i + 1;
    const rawRow = buildRowRecord(ITEMS_HEADERS, row, indexMap);

    const referenceHandle = parseText(rawRow["Reference Handle"]);
    const token = parseText(rawRow["Token"]);
    const itemName = parseText(rawRow["Item Name"]);
    const variationName = parseText(rawRow["Variation Name"]);
    const sku = parseText(rawRow["SKU"]);
    const description = parseText(rawRow["Description"]) ?? parseText(rawRow["SEO Description"]);
    const categories = parseText(rawRow["Categories"]);
    const reportingCategory = parseText(rawRow["Reporting Category"]);
    const visibility = parseText(rawRow["Square Online Item Visibility"]);
    const itemType = parseText(rawRow["Item Type"]);
    const archived = parseText(rawRow["Archived"]);
    const skipDetail = parseText(rawRow["Skip Detail Screen in POS"]);
    const optionName1 = parseText(rawRow["Option Name 1"]);
    const optionValue1 = parseText(rawRow["Option Value 1"]);
    const price = parseNumber(rawRow["Price"]);
    const onlineSalePrice = parseNumber(rawRow["Online Sale Price"]);
    const defaultUnitCost = parseNumber(rawRow["Default Unit Cost"]);
    const currentQuantity = parseNumber(
      rawRow["Current Quantity PIckup Location (NOT A STORE)"]
    );

    const rowErrors: string[] = [];
    if (!referenceHandle) rowErrors.push("missing Reference Handle");
    if (!token) rowErrors.push("missing Token");
    if (!itemName) rowErrors.push("missing Item Name");
    if (!variationName) rowErrors.push("missing Variation Name");
    if (!visibility) rowErrors.push("missing Square Online Item Visibility");
    if (!itemType) rowErrors.push("missing Item Type");
    if (!archived) rowErrors.push("missing Archived");
    if (!skipDetail) rowErrors.push("missing Skip Detail Screen in POS");
    if (currentQuantity === null) rowErrors.push("missing Current Quantity");

    if (archived && archived !== "N") rowErrors.push("Archived must be N");
    if (skipDetail && skipDetail !== "N") rowErrors.push("Skip Detail Screen in POS must be N");

    if (rowErrors.length > 0) {
      errors.push({
        sheet: ITEMS_SHEET,
        rowNumber,
        message: rowErrors.join(", "),
      });
    }

    parsedRows.push({
      rowNumber,
      rawRow,
      referenceHandle,
      token,
      itemName,
      variationName,
      sku,
      description,
      categories,
      reportingCategory,
      price,
      onlineSalePrice,
      archived,
      itemType,
      visibility,
      skipDetail,
      optionName1,
      optionValue1,
      defaultUnitCost,
      currentQuantity,
      errors: rowErrors,
    });
  }

  return { rows: parsedRows, errors, rowsParsed };
};

const parseComponentSheet = (
  sheet: ExcelJS.Worksheet
): { rows: ParsedComponentRow[]; errors: ImportRowError[]; rowsParsed: number } => {
  const rows = getWorksheetRows(sheet);
  const headerIndex = findHeaderRowIndex(rows, ["Token (locked)", "Item Name (locked)"]);
  if (headerIndex === null) {
    throw new InventoryImportValidationError("Missing header row in Component Inventory sheet.");
  }

  const headerRow = stripTrailingEmpty(normalizeHeaderRow(rows[headerIndex] ?? []));
  const { indexMap, missing } = buildHeaderIndexMap(headerRow, COMPONENT_HEADERS);
  if (missing.length > 0) {
    const details: string[] = [];
    if (missing.length > 0) details.push(`Missing headers: ${missing.join(", ")}`);
    const message = details.length > 0
      ? `Component Inventory headers do not match the required schema. ${details.join(" ")}`
      : "Component Inventory headers do not match the required schema.";
    throw new InventoryImportValidationError(message, [
      { sheet: COMPONENT_SHEET, rowNumber: headerIndex + 1, message },
    ]);
  }

  const parsedRows: ParsedComponentRow[] = [];
  const errors: ImportRowError[] = [];
  let rowsParsed = 0;

  for (let i = headerIndex + 1; i < rows.length; i += 1) {
    const row = rows[i] ?? [];
    if (isRowEmpty(row)) continue;

    rowsParsed += 1;
    const rowNumber = i + 1;
    const rawRow = buildRowRecord(COMPONENT_HEADERS, row, indexMap);
    const token = parseText(rawRow["Token (locked)"]);
    const itemName = parseText(rawRow["Item Name (locked)"]);
    const variationName = parseText(rawRow["Variation Name (locked)"]);

    const rowErrors: string[] = [];
    if (!token) rowErrors.push("missing Token");
    if (!itemName) rowErrors.push("missing Item Name");
    if (!variationName) rowErrors.push("missing Variation Name");

    if (rowErrors.length > 0) {
      errors.push({
        sheet: COMPONENT_SHEET,
        rowNumber,
        message: rowErrors.join(", "),
      });
    }

    parsedRows.push({
      rowNumber,
      rawRow,
      token,
      itemName,
      variationName,
      errors: rowErrors,
    });
  }

  return { rows: parsedRows, errors, rowsParsed };
};

export type InventoryImportResult = {
  importId?: string;
  checksum: string;
  dryRun: boolean;
  alreadyImported?: boolean;
  rowsParsed: number;
  rowsUpserted: number;
  rowsFailed: number;
  componentRowsParsed: number;
  errors: ImportRowError[];
};

export class InventoryImportService {
  private readonly productRepo: ProductRepository;
  private readonly importRepo: InventoryImportRepository;
  private readonly productService: ProductService;
  private readonly parser: ProductTitleParserService;

  constructor(private readonly supabase: TypedSupabaseClient) {
    this.productRepo = new ProductRepository(supabase);
    this.importRepo = new InventoryImportRepository(supabase);
    this.productService = new ProductService(supabase);
    this.parser = new ProductTitleParserService(supabase);
  }

  private async ensureProductTags(productId: string, tags: TagInputItem[], tenantId: string) {
    const filtered = tags.filter((tag) => !tag.group_key.startsWith("size_"));
    if (filtered.length === 0) return;
    const upserted = await upsertTags(this.supabase, { tenantId, tags: filtered });
    for (const tag of upserted) {
      await this.productRepo.linkProductTag(productId, tag.id);
    }
  }

  async importRdkInventoryBuffer(input: {
    buffer: ArrayBuffer;
    fileName: string;
    fileSize: number;
    userId: string;
    tenantId: string;
    dryRun: boolean;
    overrideCategory?: Category;
    overrideCondition?: Condition;
    importId?: string;
    checksum?: string;
    skipIdempotency?: boolean;
  }): Promise<InventoryImportResult> {
    if (!input.fileName.toLowerCase().endsWith(ALLOWED_EXTENSION)) {
      throw new InventoryImportValidationError("Only .xlsx files are supported.");
    }

    if (input.fileSize > MAX_FILE_BYTES) {
      throw new InventoryImportValidationError("File exceeds the 10MB limit.");
    }

    const checksum =
      input.checksum ??
      crypto.createHash("sha256").update(Buffer.from(input.buffer)).digest("hex");

    if (!input.dryRun && !input.skipIdempotency) {
      const existingImport = await this.importRepo.findImportByChecksum(input.tenantId, checksum);
      if (existingImport) {
        return {
          importId: existingImport.id,
          checksum,
          dryRun: false,
          alreadyImported: true,
          rowsParsed: existingImport.rows_parsed ?? 0,
          rowsUpserted: existingImport.rows_upserted ?? 0,
          rowsFailed: existingImport.rows_failed ?? 0,
          componentRowsParsed: 0,
          errors: [],
        };
      }
    }

    let itemsParsed: ReturnType<typeof parseItemsSheet> | null = null;
    let componentParsed: ReturnType<typeof parseComponentSheet> | null = null;
    let errors: ImportRowError[] = [];
    let importId: string | undefined = input.importId;

    try {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(Buffer.from(input.buffer));
      const itemsSheet = workbook.getWorksheet(ITEMS_SHEET);
      const componentSheet = workbook.getWorksheet(COMPONENT_SHEET);

      if (!itemsSheet) {
        throw new InventoryImportValidationError("Missing Items sheet.");
      }
      if (!componentSheet) {
        throw new InventoryImportValidationError("Missing Component Inventory sheet.");
      }

      itemsParsed = parseItemsSheet(itemsSheet);
      componentParsed = parseComponentSheet(componentSheet);
      errors = [...itemsParsed.errors, ...componentParsed.errors];

      const missingIssues: ImportRowError[] = [];
      const needsCategoryOverride = !input.overrideCategory;
      const needsConditionOverride = !input.overrideCondition;

      if (needsCategoryOverride || needsConditionOverride) {
        for (const row of itemsParsed.rows) {
          if (row.errors.length > 0) continue;
          const categoryPaths = parseCategoryPaths(row.categories);
          const categoryCandidate = resolveCategory(
            categoryPaths,
            [row.reportingCategory, row.itemName, row.description]
          );
          const conditionCandidate = resolveCondition([
            row.description,
            row.categories,
            row.itemName,
            row.variationName,
          ]);

          if (needsCategoryOverride && !categoryCandidate) {
            missingIssues.push({
              sheet: ITEMS_SHEET,
              rowNumber: row.rowNumber,
              message: "missing Category",
            });
          }
          if (needsConditionOverride && !conditionCandidate) {
            missingIssues.push({
              sheet: ITEMS_SHEET,
              rowNumber: row.rowNumber,
              message: "missing Condition",
            });
          }
        }
      }

      if (missingIssues.length > 0) {
        throw new InventoryImportValidationError(
          "Missing category or condition. Select overrides to continue.",
          missingIssues
        );
      }

      if (!input.dryRun && !importId) {
        const importRow = await this.importRepo.createImport({
          tenant_id: input.tenantId,
          created_by: input.userId,
          source: "rdk_excel",
          checksum,
          file_name: input.fileName,
          file_size: input.fileSize,
          dry_run: false,
          status: "processing",
          rows_parsed: 0,
          rows_upserted: 0,
          rows_failed: 0,
        });
        importId = importRow.id;
      }

      if (!input.dryRun && importId) {
        await this.importRepo.updateImport(importId, {
          rows_parsed: itemsParsed.rowsParsed,
          status: "processing",
        });
      }
    } catch (error) {
      if (!input.dryRun && importId) {
        await this.importRepo.updateImport(importId, {
          status: "failed",
        });
      }
      throw error;
    }

    if (!itemsParsed || !componentParsed) {
      throw new InventoryImportValidationError("Unable to read workbook sheets.");
    }

    const importRowsLog: TablesInsert<"inventory_import_rows">[] = [];

    const productCache = new Map<string, string>();
    let rowsUpserted = 0;
    let rowsFailed = 0;

    const progressBatchSize = 25;
    let processedCount = 0;

    try {
      for (const row of itemsParsed.rows) {
        const baseLog = importId
          ? {
              importId,
              sheetName: ITEMS_SHEET as SheetName,
              rowNumber: row.rowNumber,
              token: row.token,
              referenceHandle: row.referenceHandle,
              rawRow: row.rawRow,
            }
          : null;

        if (row.errors.length > 0) {
          rowsFailed += 1;
          if (baseLog) {
            importRowsLog.push(buildImportRowLog(baseLog, "failed", row.errors.join(", ")));
          }
          processedCount += 1;
          if (!input.dryRun && importId && processedCount % progressBatchSize === 0) {
            await this.importRepo.updateImport(importId, {
              rows_upserted: rowsUpserted,
              rows_failed: rowsFailed,
              status: "processing",
            });
          }
          continue;
        }

        const itemName = row.itemName ?? "";
        const variationName = row.variationName ?? "";
        const categoryPaths = parseCategoryPaths(row.categories);
        const category =
          resolveCategory(categoryPaths, [row.reportingCategory, itemName, row.description]) ??
          input.overrideCategory ??
          null;
        const condition =
          resolveCondition([row.description, row.categories, itemName, variationName]) ??
          input.overrideCondition ??
          null;

        if (!category) {
          rowsFailed += 1;
          errors.push({
            sheet: ITEMS_SHEET,
            rowNumber: row.rowNumber,
            message: "missing Category",
          });
          if (baseLog) {
            importRowsLog.push(buildImportRowLog(baseLog, "failed", "missing Category"));
          }
          processedCount += 1;
          if (!input.dryRun && importId && processedCount % progressBatchSize === 0) {
            await this.importRepo.updateImport(importId, {
              rows_upserted: rowsUpserted,
              rows_failed: rowsFailed,
              status: "processing",
            });
          }
          continue;
        }

        if (!condition) {
          rowsFailed += 1;
          errors.push({
            sheet: ITEMS_SHEET,
            rowNumber: row.rowNumber,
            message: "missing Condition",
          });
          if (baseLog) {
            importRowsLog.push(buildImportRowLog(baseLog, "failed", "missing Condition"));
          }
          processedCount += 1;
          if (!input.dryRun && importId && processedCount % progressBatchSize === 0) {
            await this.importRepo.updateImport(importId, {
              rows_upserted: rowsUpserted,
              rows_failed: rowsFailed,
              status: "processing",
            });
          }
          continue;
        }

        const sizeType = resolveSizeType(category);
        const optionValue =
          row.optionName1?.toLowerCase().includes("size") ? row.optionValue1 : null;
        const sizeLabelCandidate =
          sizeType === "none"
            ? "N/A"
            : extractSizeLabel(sizeType, [
                variationName,
                optionValue,
                itemName,
                row.description,
              ]);
        const sizeLabelFallback =
          variationName.trim() || optionValue?.trim() || "";
        const sizeLabel =
          sizeType === "none"
            ? "N/A"
            : sizeLabelCandidate ?? sizeLabelFallback;
        const priceSource = row.onlineSalePrice ?? row.price;
        const priceCents = parseMoneyToCents(priceSource);
        const costCents = parseMoneyToCents(row.defaultUnitCost) ?? 0;
        const stock = parseInteger(row.currentQuantity) ?? 0;

        if (priceCents === null) {
          rowsFailed += 1;
          errors.push({
            sheet: ITEMS_SHEET,
            rowNumber: row.rowNumber,
            message: "missing Price",
          });
          if (baseLog) {
            importRowsLog.push(buildImportRowLog(baseLog, "failed", "missing Price"));
          }
          processedCount += 1;
          if (!input.dryRun && importId && processedCount % progressBatchSize === 0) {
            await this.importRepo.updateImport(importId, {
              rows_upserted: rowsUpserted,
              rows_failed: rowsFailed,
              status: "processing",
            });
          }
          continue;
        }

        if (sizeType !== "none" && !sizeLabel) {
          rowsFailed += 1;
          errors.push({
            sheet: ITEMS_SHEET,
            rowNumber: row.rowNumber,
            message: "missing Size",
          });
          if (baseLog) {
            importRowsLog.push(buildImportRowLog(baseLog, "failed", "missing Size"));
          }
          processedCount += 1;
          if (!input.dryRun && importId && processedCount % progressBatchSize === 0) {
            await this.importRepo.updateImport(importId, {
              rows_upserted: rowsUpserted,
              rows_failed: rowsFailed,
              status: "processing",
            });
          }
          continue;
        }

        const variantInput: ProductCreateInput["variants"][number] = {
          size_type: sizeType,
          size_label: sizeLabel,
          price_cents: priceCents,
          cost_cents: costCents,
          stock,
        };

        const token = row.token ?? "";

        const external = await this.importRepo.getExternalVariantByToken(input.tenantId, token);

        if (input.dryRun) {
          rowsUpserted += 1;
          processedCount += 1;
          continue;
        }

        try {
          const parsed = await this.parser.parseTitle({
            titleRaw: itemName,
            category,
            tenantId: input.tenantId,
          });

          const tags = buildImportTags(parsed, category, condition, [variantInput], categoryPaths);

          if (external) {
            await this.productRepo.updateVariant(external.variant_id, {
              size_label: sizeLabel,
              price_cents: priceCents,
              cost_cents: costCents,
              stock,
            });

            await this.productService.syncSizeTags(external.product_id);
            await this.ensureProductTags(external.product_id, tags, input.tenantId);

            await this.importRepo.updateExternalVariant(external.id, {
              reference_handle: row.referenceHandle,
              item_name: row.itemName,
              variation_name: row.variationName,
              sku: row.sku,
              last_import_id: importId ?? null,
              updated_at: new Date().toISOString(),
            });

            rowsUpserted += 1;
            if (baseLog) {
              importRowsLog.push(buildImportRowLog(baseLog, "upserted"));
            }
            processedCount += 1;
            if (importId && processedCount % progressBatchSize === 0) {
              await this.importRepo.updateImport(importId, {
                rows_upserted: rowsUpserted,
                rows_failed: rowsFailed,
                status: "processing",
              });
            }
            continue;
          }

          const cacheKey = `${normalizeTitleKey(itemName)}|${category}`;
          let productId = productCache.get(cacheKey);

          if (!productId) {
            const existing = await this.productRepo.findByTitleAndCategory(
              itemName,
              category,
              input.tenantId
            );
            if (existing) {
              productId = existing.id;
            }
          }

          if (!productId) {
            const inputData: ProductCreateInput = {
              title_raw: itemName,
              category,
              condition,
              description: row.description || undefined,
              variants: [variantInput],
              images: [
                {
                  url: "/placeholder.png",
                  sort_order: 0,
                  is_primary: true,
                },
              ],
              tags,
            };

            const created = await this.productService.createProduct(inputData, {
              userId: input.userId,
              tenantId: input.tenantId,
              marketplaceId: null,
              sellerId: null,
            });

            productId = created.id;
            const createdProduct = await this.productRepo.getById(productId, {
              tenantId: input.tenantId,
            });
            const createdVariant = createdProduct?.variants.find(
              (variant) => variant.size_type === sizeType && variant.size_label === sizeLabel
            );
            if (!createdVariant) {
              throw new Error("Unable to locate created variant.");
            }

            await this.importRepo.createExternalVariant({
              tenant_id: input.tenantId,
              token,
              reference_handle: row.referenceHandle,
              item_name: row.itemName,
              variation_name: row.variationName,
              sku: row.sku,
              product_id: productId,
              variant_id: createdVariant.id,
              last_import_id: importId ?? null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });

            rowsUpserted += 1;
            productCache.set(cacheKey, productId);

            if (baseLog) {
              importRowsLog.push(buildImportRowLog(baseLog, "upserted"));
            }
            processedCount += 1;
            if (importId && processedCount % progressBatchSize === 0) {
              await this.importRepo.updateImport(importId, {
                rows_upserted: rowsUpserted,
                rows_failed: rowsFailed,
                status: "processing",
              });
            }
            continue;
          }

          const variant = await this.productRepo.createVariant({
            product_id: productId,
            size_type: sizeType,
            size_label: sizeLabel,
            price_cents: priceCents,
            cost_cents: costCents,
            stock,
          });

          await this.productService.syncSizeTags(productId);
          await this.ensureProductTags(productId, tags, input.tenantId);

          await this.importRepo.createExternalVariant({
            tenant_id: input.tenantId,
            token,
            reference_handle: row.referenceHandle,
            item_name: row.itemName,
            variation_name: row.variationName,
            sku: row.sku,
            product_id: productId,
            variant_id: variant.id,
            last_import_id: importId ?? null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });

          rowsUpserted += 1;
          productCache.set(cacheKey, productId);

          if (baseLog) {
            importRowsLog.push(buildImportRowLog(baseLog, "upserted"));
          }
          processedCount += 1;
          if (importId && processedCount % progressBatchSize === 0) {
            await this.importRepo.updateImport(importId, {
              rows_upserted: rowsUpserted,
              rows_failed: rowsFailed,
              status: "processing",
            });
          }
        } catch (error) {
          rowsFailed += 1;
          errors.push({
            sheet: ITEMS_SHEET,
            rowNumber: row.rowNumber,
            message: "failed to upsert row",
          });
          if (baseLog) {
            importRowsLog.push(buildImportRowLog(baseLog, "failed", "failed to upsert row"));
          }
          processedCount += 1;
          if (importId && processedCount % progressBatchSize === 0) {
            await this.importRepo.updateImport(importId, {
              rows_upserted: rowsUpserted,
              rows_failed: rowsFailed,
              status: "processing",
            });
          }
        }
      }

      for (const row of componentParsed.rows) {
        if (!importId) continue;
        const baseLog = {
          importId,
          sheetName: COMPONENT_SHEET as SheetName,
          rowNumber: row.rowNumber,
          token: row.token,
          referenceHandle: row.rawRow["Reference Handle"] as string | null,
          rawRow: row.rawRow,
        };

        if (row.errors.length > 0) {
          importRowsLog.push(buildImportRowLog(baseLog, "failed", row.errors.join(", ")));
        } else {
          importRowsLog.push(buildImportRowLog(baseLog, "parsed"));
        }
      }

      if (!input.dryRun && importId) {
        await this.importRepo.insertImportRows(importRowsLog);
        await this.importRepo.updateImport(importId, {
          rows_parsed: itemsParsed.rowsParsed,
          rows_upserted: rowsUpserted,
          rows_failed: rowsFailed,
          status: "completed",
        });
      }
    } catch (error) {
      if (!input.dryRun && importId) {
        await this.importRepo.updateImport(importId, {
          rows_upserted: rowsUpserted,
          rows_failed: rowsFailed,
          status: "failed",
        });
      }
      throw error;
    }

    return {
      importId,
      checksum,
      dryRun: input.dryRun,
      rowsParsed: itemsParsed.rowsParsed,
      rowsUpserted,
      rowsFailed,
      componentRowsParsed: componentParsed.rowsParsed,
      errors,
    };
  }

  async importRdkInventory(input: {
    file: File;
    userId: string;
    tenantId: string;
    dryRun: boolean;
    overrideCategory?: Category;
    overrideCondition?: Condition;
  }): Promise<InventoryImportResult> {
    const buffer = await input.file.arrayBuffer();
    return this.importRdkInventoryBuffer({
      buffer,
      fileName: input.file.name,
      fileSize: input.file.size,
      userId: input.userId,
      tenantId: input.tenantId,
      dryRun: input.dryRun,
      overrideCategory: input.overrideCategory,
      overrideCondition: input.overrideCondition,
    });
  }
}

export { InventoryImportValidationError };

