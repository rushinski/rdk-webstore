// app/api/admin/uploads/product-image/route.ts

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import { createSupabaseAdminClient } from "@/lib/supabase/service-role";
import { requireAdminApi } from "@/lib/auth/session";
import { ensureTenantId } from "@/lib/auth/tenant";
import { getRequestIdFromHeaders } from "@/lib/http/request-id";
import { logError } from "@/lib/utils/log";
import { ProductImageService } from "@/services/product-image-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const formSchema = z.object({
  // optional: allow UI to pass productId so we can place into that folder immediately
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
      return NextResponse.json(
        { error: "Content-Type must be multipart/form-data", requestId },
        { status: 415, headers: { "Cache-Control": "no-store" } },
      );
    }

    const form = await request.formData();

    // Support both single file upload and multiple files
    const fileEntries = form.getAll("file").filter((entry): entry is File => entry instanceof File);
    const filesEntries = form.getAll("files").filter((entry): entry is File => entry instanceof File);
    
    // Combine both "file" and "files" fields
    const allFiles = [...fileEntries, ...filesEntries];

    if (allFiles.length === 0) {
      return NextResponse.json(
        { error: "No files provided. Use 'file' or 'files' field", requestId },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }

    const parsedMeta = formSchema.safeParse({
      productId: form.get("productId") ?? undefined,
    });

    if (!parsedMeta.success) {
      return NextResponse.json(
        { error: "Invalid form fields", issues: parsedMeta.error.format(), requestId },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }

    const service = new ProductImageService(supabase);
    
    // Upload all files
    const uploadResults = await Promise.all(
      allFiles.map((file) =>
        service.uploadProductImage({
          tenantId,
          file,
          productId: parsedMeta.data.productId ?? null,
        })
      )
    );

    // Return array of results for multiple files, or single result for backward compatibility
    const responseData = allFiles.length === 1 
      ? { ...uploadResults[0], requestId }
      : { uploads: uploadResults, count: uploadResults.length, requestId };

    return NextResponse.json(
      responseData,
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    logError(error, {
      layer: "api",
      requestId,
      route: "/api/admin/uploads/product-image",
    });
    return NextResponse.json(
      { error: "Failed to upload product image(s)", requestId },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}