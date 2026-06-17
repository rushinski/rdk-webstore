import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdminApi } from "@/lib/auth/session";
import { ensureTenantId } from "@/lib/auth/tenant";
import { getRequestIdFromHeaders } from "@/lib/http/request-id";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logError } from "@/lib/utils/log";
import { LightspeedReconciliationSyncService } from "@/services/lightspeed-reconciliation-sync-service";

const categoryOverrideSchema = z
  .object({
    remoteProductId: z.string(),
    category: z.union([
      z.literal("sneakers"),
      z.literal("clothing"),
      z.literal("accessories"),
      z.literal("electronics"),
    ]),
  })
  .strict();

const syncBodySchema = z.union([
  z
    .object({
      action: z.literal("scan_preview_chunk"),
      after: z.number().int().min(0).nullable(),
      pageSize: z.number().int().min(1).max(100),
      chunkIndex: z.number().int().min(1),
    })
    .strict(),
  z
    .object({
      action: z.literal("scan_preview_chunk"),
      page: z.number().int().min(1),
      pageSize: z.number().int().min(1).max(100),
    })
    .strict(),
  z
    .object({
      action: z.literal("apply"),
    })
    .strict(),
  z
    .object({
      action: z.literal("apply_import_chunk"),
      remoteProductIds: z.array(z.string()).min(1),
      categoryOverrides: z.array(categoryOverrideSchema).optional(),
    })
    .strict(),
  z
    .object({
      action: z.literal("apply_edit_chunk"),
      edits: z
        .array(
          z
            .object({
              websiteProductId: z.string().uuid(),
              remoteProductId: z.string(),
              reason: z.union([z.literal("link"), z.literal("sku")]).optional(),
            })
            .strict(),
        )
        .min(1),
      categoryOverrides: z.array(categoryOverrideSchema).optional(),
    })
    .strict(),
  z
    .object({
      action: z.literal("apply_restore_chunk"),
      restores: z
        .array(
          z
            .object({
              websiteProductId: z.string().uuid(),
              remoteProductId: z.string(),
              reason: z.union([z.literal("link"), z.literal("sku")]).optional(),
            })
            .strict(),
        )
        .min(1),
      categoryOverrides: z.array(categoryOverrideSchema).optional(),
    })
    .strict(),
  z
    .object({
      action: z.literal("apply_archive_chunk"),
      websiteProductIds: z.array(z.string().uuid()).min(1),
    })
    .strict(),
]);

export async function GET(request: Request) {
  const requestId = getRequestIdFromHeaders(new Headers(request.headers));

  try {
    const session = await requireAdminApi();
    const supabase = await createSupabaseServerClient();
    const tenantId = await ensureTenantId(session, supabase);
    const service = new LightspeedReconciliationSyncService(supabase);
    const preview = await service.preview({ tenantId });

    return NextResponse.json(
      { preview, requestId },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    logError(error, {
      layer: "api",
      route: "/api/admin/lightspeed/sync",
      requestId,
    });
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to preview Lightspeed sync",
        requestId,
      },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}

export async function POST(request: Request) {
  const requestId = getRequestIdFromHeaders(new Headers(request.headers));

  try {
    const body = await request.json().catch(() => null);
    const parsed = syncBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.format(), requestId },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }

    const session = await requireAdminApi();
    const supabase = await createSupabaseServerClient();
    const tenantId = await ensureTenantId(session, supabase);
    const service = new LightspeedReconciliationSyncService(supabase);
    const result =
      parsed.data.action === "scan_preview_chunk"
        ? await service.scanPreviewChunk({
            tenantId,
            after: "after" in parsed.data ? parsed.data.after : null,
            pageSize: parsed.data.pageSize,
            chunkIndex:
              "chunkIndex" in parsed.data ? parsed.data.chunkIndex : parsed.data.page,
          })
        : parsed.data.action === "apply"
          ? await service.apply({ tenantId })
          : parsed.data.action === "apply_import_chunk"
            ? await service.applyImportChunk({
                tenantId,
                remoteProductIds: parsed.data.remoteProductIds,
                categoryOverrides: parsed.data.categoryOverrides,
              })
            : parsed.data.action === "apply_edit_chunk"
              ? await service.applyEditChunk({
                  tenantId,
                  edits: parsed.data.edits,
                  categoryOverrides: parsed.data.categoryOverrides,
                })
              : parsed.data.action === "apply_restore_chunk"
                ? await service.applyRestoreChunk({
                    tenantId,
                    restores: parsed.data.restores,
                    categoryOverrides: parsed.data.categoryOverrides,
                  })
                : await service.applyArchiveChunk({
                    tenantId,
                    websiteProductIds: parsed.data.websiteProductIds,
                  });

    return NextResponse.json(
      { result, requestId },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    logError(error, {
      layer: "api",
      route: "/api/admin/lightspeed/sync",
      requestId,
    });
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to apply Lightspeed sync",
        requestId,
      },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
