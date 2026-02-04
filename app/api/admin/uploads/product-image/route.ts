// app/api/admin/uploads/product-image/route.ts
/**
 * Product Image Upload API - FIXED VERSION
 * 
 * Handles multiple file uploads with simple contain strategy.
 * All images are resized to 1200x1200 with white padding to ensure
 * the entire product is visible.
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import { createSupabaseAdminClient } from "@/lib/supabase/service-role";
import { requireAdminApi } from "@/lib/auth/session";
import { ensureTenantId } from "@/lib/auth/tenant";
import { getRequestIdFromHeaders } from "@/lib/http/request-id";
import { logError } from "@/lib/utils/log";
import { ProductImageService } from "@/services/product-image-service";

type UploadSuccess = {
  status: "success";
  result: {
    url: string;
    originalUrl: string;
    path: string;
    originalPath: string;
    mimeType: string;
    bytes: number;
    hash: string;
    bucket: string;
    qualityScore: number;
    processingStrategy: "contain_solid" | "cover_smartcrop";
    needsReview: boolean;
  };
  index: number;
};

type UploadError = {
  status: "error";
  error: {
    index: number;
    fileName: string;
    error: string;
  };
  index: number;
};

type UploadResult = UploadSuccess | UploadError;

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const formSchema = z.object({
  productId: z.string().uuid().optional(),
});

export async function POST(request: NextRequest) {
  const requestId = getRequestIdFromHeaders(request.headers);

  try {
    const session = await requireAdminApi();
    const supabase = createSupabaseAdminClient();
    const tenantId = await ensureTenantId(session, supabase);

    const contentType = request.headers.get("content-type") ?? "";
    if (!contentType.toLowerCase().includes("multipart/form-data")) {
      console.error("[Product Upload] Invalid content type:", contentType);
      return NextResponse.json(
        { error: "Content-Type must be multipart/form-data", requestId },
        { status: 415, headers: { "Cache-Control": "no-store" } },
      );
    }

    let form: FormData;
    try {
      form = await request.formData();
    } catch (formError) {
      console.error("[Product Upload] FormData parsing failed:", formError);
      logError(formError, {
        layer: "api",
        requestId,
        route: "/api/admin/uploads/product-image",
        message: "formdata_parse_failed",
      });
      return NextResponse.json(
        { error: "Failed to parse form data", requestId },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }

    const fileEntries = form
      .getAll("file")
      .filter((entry): entry is File => entry instanceof File);
    const filesEntries = form
      .getAll("files")
      .filter((entry): entry is File => entry instanceof File);

    const allFiles = [...fileEntries, ...filesEntries];

    console.info("[Product Upload] Files received:", {
      fileCount: fileEntries.length,
      filesCount: filesEntries.length,
      total: allFiles.length,
      formKeys: Array.from(form.keys()),
    });

    if (allFiles.length === 0) {
      console.error("[Product Upload] No files found in form data");
      return NextResponse.json(
        { error: "No files provided. Use 'file' or 'files' field", requestId },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }

    const parsedMeta = formSchema.safeParse({
      productId: form.get("productId") ?? undefined,
    });

    if (!parsedMeta.success) {
      console.error("[Product Upload] Invalid form fields:", parsedMeta.error);
      return NextResponse.json(
        { error: "Invalid form fields", issues: parsedMeta.error.format(), requestId },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }

    const service = new ProductImageService(supabase);

    // Process all files in parallel
    const uploadPromises = allFiles.map(async (file, index): Promise<UploadResult> => {
      try {
        console.info(
          `[Product Upload] Processing file ${index + 1}/${allFiles.length}:`,
          {
            name: file.name,
            type: file.type,
            size: file.size,
          },
        );

        const result = await service.uploadProductImage({
          tenantId,
          file,
          productId: parsedMeta.data.productId ?? null,
        });

        console.info(
          `[Product Upload] File ${index + 1} uploaded successfully:`,
          {
            path: result.path,
            qualityScore: result.qualityScore,
            needsReview: result.needsReview,
            strategy: result.processingStrategy,
          },
        );

        return { status: "success", result, index };
      } catch (uploadError) {
        console.error(`[Product Upload] File ${index + 1} upload failed:`, uploadError);
        logError(uploadError, {
          layer: "api",
          requestId,
          route: "/api/admin/uploads/product-image",
          message: `file_upload_failed_${index}`,
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
        });

        return {
          status: "error",
          error: {
            index,
            fileName: file.name,
            error: uploadError instanceof Error ? uploadError.message : "Unknown error",
          },
          index,
        };
      }
    });

    // Wait for all uploads to complete
    const results = await Promise.allSettled(uploadPromises);

    // Separate successes and failures
    const uploadResults = results
      .filter(
        (r): r is PromiseFulfilledResult<UploadSuccess> =>
          r.status === "fulfilled" && r.value.status === "success",
      )
      .map((r) => r.value.result);

    const uploadErrors = results
      .filter(
        (r): r is PromiseFulfilledResult<UploadError> =>
          r.status === "fulfilled" && r.value.status === "error",
      )
      .map((r) => r.value.error)
      .concat(
        results
          .filter((r): r is PromiseRejectedResult => r.status === "rejected")
          .map((r, idx) => ({
            index: idx,
            fileName: allFiles[idx]?.name ?? "unknown",
            error: r.reason instanceof Error ? r.reason.message : "Unknown error",
          })),
      );

    // Check for images that need manual review
    const needsReviewCount = uploadResults.filter((r) => r.needsReview).length;

    // If all uploads failed, return error
    if (uploadResults.length === 0) {
      console.error("[Product Upload] All uploads failed:", uploadErrors);
      return NextResponse.json(
        {
          error: "All file uploads failed",
          details: uploadErrors,
          requestId,
        },
        { status: 500, headers: { "Cache-Control": "no-store" } },
      );
    }

    // Log quality metrics
    if (needsReviewCount > 0) {
      console.warn(`[Product Upload] ${needsReviewCount} images flagged for review`, {
        total: uploadResults.length,
        needsReview: uploadResults
          .filter((r) => r.needsReview)
          .map((r) => ({
            path: r.path,
            score: r.qualityScore,
            strategy: r.processingStrategy,
          })),
      });
    }

    // Build response
    const responseData = {
      uploads: uploadResults,
      count: uploadResults.length,
      failures: uploadErrors.length > 0 ? uploadErrors : undefined,
      needsReviewCount: needsReviewCount > 0 ? needsReviewCount : undefined,
      requestId,
    };

    return NextResponse.json(responseData, {
      status: 201,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("[Product Upload] Unexpected error:", error);
    logError(error, {
      layer: "api",
      requestId,
      route: "/api/admin/uploads/product-image",
    });
    return NextResponse.json(
      {
        error: "Failed to upload product image(s)",
        message: error instanceof Error ? error.message : "Unknown error",
        requestId,
      },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}