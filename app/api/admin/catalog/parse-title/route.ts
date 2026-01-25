import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdminApi } from "@/lib/auth/session";
import { ensureTenantId } from "@/lib/auth/tenant";
import { ProductTitleParserService } from "@/services/product-title-parser-service";
import { getRequestIdFromHeaders } from "@/lib/http/request-id";
import { logError } from "@/lib/utils/log";

const parseTitleSchema = z
  .object({
    titleRaw: z.string().trim().min(1),
    category: z.string().trim().min(1),
    brandOverrideId: z.string().uuid().nullable().optional(),
    modelOverrideId: z.string().uuid().nullable().optional(),
  })
  .strict();

export async function POST(request: NextRequest) {
  const requestId = getRequestIdFromHeaders(request.headers);

  try {
    const session = await requireAdminApi();
    const supabase = await createSupabaseServerClient();
    const tenantId = await ensureTenantId(session, supabase);
    const payload = await request.json().catch(() => null);
    const parsedPayload = parseTitleSchema.safeParse(payload);

    if (!parsedPayload.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsedPayload.error.format(), requestId },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }

    const parser = new ProductTitleParserService(supabase);
    const parsed = await parser.parseTitle({
      titleRaw: parsedPayload.data.titleRaw,
      category: parsedPayload.data.category,
      brandOverrideId: parsedPayload.data.brandOverrideId ?? null,
      modelOverrideId: parsedPayload.data.modelOverrideId ?? null,
      tenantId,
    });

    return NextResponse.json(parsed, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    logError(error, {
      layer: "api",
      requestId,
      route: "/api/admin/catalog/parse-title",
    });
    return NextResponse.json(
      { error: "Failed to parse title", requestId },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
