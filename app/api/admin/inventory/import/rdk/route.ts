import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/session";
import { ensureTenantId } from "@/lib/auth/tenant";
import { getRequestIdFromHeaders } from "@/lib/http/request-id";
import { log, logError } from "@/lib/log";
import { InventoryImportRepository } from "@/repositories/inventory-import-repo";
import {
  InventoryImportService,
  InventoryImportValidationError,
} from "@/services/inventory-import-service";
import type { Category, Condition } from "@/types/views/product";

export const runtime = "nodejs";

const CATEGORY_VALUES = ["sneakers", "clothing", "accessories", "electronics"] as const;
const CONDITION_VALUES = ["new", "used"] as const;

const importOptionsSchema = z
  .object({
    overrideCategory: z.enum(CATEGORY_VALUES).optional(),
    overrideCondition: z.enum(CONDITION_VALUES).optional(),
  })
  .strict();

export async function POST(request: NextRequest) {
  const requestId = getRequestIdFromHeaders(request.headers);

  try {
    const session = await requireAdmin();
    const supabase = await createSupabaseServerClient();
    const tenantId = await ensureTenantId(session, supabase);

    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Missing Excel file.", requestId },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    const optionsParsed = importOptionsSchema.safeParse({
      overrideCategory: formData.get("overrideCategory") ?? undefined,
      overrideCondition: formData.get("overrideCondition") ?? undefined,
    });

    if (!optionsParsed.success) {
      return NextResponse.json(
        { error: "Invalid form fields", issues: optionsParsed.error.format(), requestId },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    const service = new InventoryImportService(supabase);
    const repo = new InventoryImportRepository(supabase);

    const buffer = await file.arrayBuffer();
    const checksum = crypto.createHash("sha256").update(Buffer.from(buffer)).digest("hex");

    const existingImport = await repo.findImportByChecksum(tenantId, checksum);
    if (existingImport) {
      return NextResponse.json(
        {
          importId: existingImport.id,
          checksum,
          dryRun: false,
          alreadyImported: true,
          rowsParsed: existingImport.rows_parsed ?? 0,
          rowsUpserted: existingImport.rows_upserted ?? 0,
          rowsFailed: existingImport.rows_failed ?? 0,
          componentRowsParsed: 0,
          errors: [],
          requestId,
        },
        { headers: { "Cache-Control": "no-store" } }
      );
    }

    const needsPreflight =
      !optionsParsed.data.overrideCategory || !optionsParsed.data.overrideCondition;
    if (needsPreflight) {
      await service.importRdkInventoryBuffer({
        buffer,
        fileName: file.name,
        fileSize: file.size,
        userId: session.user.id,
        tenantId,
        dryRun: true,
        overrideCategory: optionsParsed.data.overrideCategory as Category | undefined,
        overrideCondition: optionsParsed.data.overrideCondition as Condition | undefined,
        skipIdempotency: true,
      });
    }

    const importRow = await repo.createImport({
      tenant_id: tenantId,
      created_by: session.user.id,
      source: "rdk_excel",
      checksum,
      file_name: file.name,
      file_size: file.size,
      dry_run: false,
      status: "processing",
      rows_parsed: 0,
      rows_upserted: 0,
      rows_failed: 0,
    });

    const importId = importRow.id;

    void service
      .importRdkInventoryBuffer({
        buffer,
        fileName: file.name,
        fileSize: file.size,
        userId: session.user.id,
        tenantId,
        dryRun: false,
        overrideCategory: optionsParsed.data.overrideCategory as Category | undefined,
        overrideCondition: optionsParsed.data.overrideCondition as Condition | undefined,
        importId,
        checksum,
        skipIdempotency: true,
      })
      .then((result) => {
        log({
          level: "info",
          layer: "api",
          message: "rdk_inventory_import_completed",
          requestId,
          route: "/api/admin/inventory/import/rdk",
          rowsParsed: result.rowsParsed,
          rowsUpserted: result.rowsUpserted,
          rowsFailed: result.rowsFailed,
          importId: result.importId ?? null,
        });
      })
      .catch(async (error) => {
        logError(error, {
          layer: "api",
          requestId,
          route: "/api/admin/inventory/import/rdk",
        });
        await repo.updateImport(importId, { status: "failed" });
      });

    return NextResponse.json(
      {
        importId,
        checksum,
        dryRun: false,
        status: "processing",
        requestId,
      },
      { status: 202, headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    if (error instanceof InventoryImportValidationError) {
      return NextResponse.json(
        { error: error.message, issues: error.issues ?? null, requestId },
        { status: error.status, headers: { "Cache-Control": "no-store" } }
      );
    }

    logError(error, {
      layer: "api",
      requestId,
      route: "/api/admin/inventory/import/rdk",
    });
    return NextResponse.json(
      { error: "Failed to import inventory.", requestId },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
