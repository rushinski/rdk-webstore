// app/api/admin/uploads/product-image/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/service-role";
import { requireAdminApi } from "@/lib/auth/session";
import { ensureTenantId } from "@/lib/auth/tenant";
import { getRequestIdFromHeaders } from "@/lib/http/request-id";
import { logError } from "@/lib/log";
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

    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Missing file field 'file'", requestId },
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
    const result = await service.uploadProductImage({
      tenantId,
      file,
      productId: parsedMeta.data.productId ?? null,
    });

    return NextResponse.json(
      {
        ...result,
        requestId,
      },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    logError(error, {
      layer: "api",
      requestId,
      route: "/api/admin/uploads/product-image",
    });
    return NextResponse.json(
      { error: "Failed to upload product image", requestId },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
