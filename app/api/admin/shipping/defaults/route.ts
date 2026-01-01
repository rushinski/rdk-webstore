import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdminApi } from "@/lib/auth/session";
import { ShippingDefaultsService } from "@/services/shipping-defaults-service";
import { getRequestIdFromHeaders } from "@/lib/http/request-id";
import { logError } from "@/lib/log";

const defaultsSchema = z
  .object({
    defaults: z
      .array(
        z
          .object({
            category: z.string().trim().min(1),
            default_price: z.number().nonnegative(),
          })
          .strict()
      )
      .default([]),
  })
  .strict();

export async function GET(request: NextRequest) {
  const requestId = getRequestIdFromHeaders(request.headers);

  try {
    const session = await requireAdminApi();
    const supabase = await createSupabaseServerClient();
    const service = new ShippingDefaultsService(supabase);

    const defaults = await service.list(session.profile?.tenant_id ?? null);
    return NextResponse.json(
      { defaults },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    logError(error, {
      layer: "api",
      requestId,
      route: "/api/admin/shipping/defaults",
    });
    return NextResponse.json(
      { error: "Failed to fetch shipping defaults", requestId },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}

export async function POST(request: NextRequest) {
  const requestId = getRequestIdFromHeaders(request.headers);

  try {
    const session = await requireAdminApi();
    const supabase = await createSupabaseServerClient();
    const service = new ShippingDefaultsService(supabase);

    const body = await request.json().catch(() => null);
    const parsed = defaultsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.format(), requestId },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    const saved = await service.upsertDefaults(
      session.profile?.tenant_id ?? null,
      parsed.data.defaults
    );
    return NextResponse.json(
      { defaults: saved },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    logError(error, {
      layer: "api",
      requestId,
      route: "/api/admin/shipping/defaults",
    });
    return NextResponse.json(
      { error: "Failed to save shipping defaults", requestId },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
