// app/api/account/shipping/route.ts

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireUserApi } from "@/lib/auth/session";
import { ShippingService } from "@/services/shipping-service";
import { getRequestIdFromHeaders } from "@/lib/http/request-id";
import { logError } from "@/lib/log";
import type { TablesInsert } from "@/types/db/database.types";

type ShippingProfileUpsert = TablesInsert<"shipping_profiles">;

const optionalText = z.preprocess(
  (value) => {
    if (typeof value !== "string") return value;
    const trimmed = value.trim();
    return trimmed.length === 0 ? null : trimmed;
  },
  z.string().trim().min(1).nullable().optional()
);

const shippingProfileSchema = z
  .object({
    full_name: optionalText,
    phone: optionalText,
    address_line1: optionalText,
    address_line2: optionalText,
    city: optionalText,
    state: optionalText,
    postal_code: optionalText,
    country: optionalText,
  })
  .strict();

export async function GET(request: NextRequest) {
  const requestId = getRequestIdFromHeaders(request.headers);

  try {
    const session = await requireUserApi();
    const supabase = await createSupabaseServerClient();
    const service = new ShippingService(supabase);

    const profile = await service.getProfile(session.user.id);

    return NextResponse.json(
      profile || {},
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    logError(error, {
      layer: "api",
      requestId,
      route: "/api/account/shipping",
    });
    return NextResponse.json(
      { error: "Failed to fetch shipping profile", requestId },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}

export async function POST(request: NextRequest) {
  const requestId = getRequestIdFromHeaders(request.headers);

  try {
    const session = await requireUserApi();
    const supabase = await createSupabaseServerClient();
    const service = new ShippingService(supabase);

    const body = await request.json().catch(() => null);
    const parsed = shippingProfileSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.format(), requestId },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    const input: ShippingProfileUpsert = {
      user_id: session.user.id,
      tenant_id: session.profile?.tenant_id ?? null,
      ...parsed.data,
      updated_at: new Date().toISOString(),
    };

    const profile = await service.upsertProfile(input);

    return NextResponse.json(
      profile,
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    logError(error, {
      layer: "api",
      requestId,
      route: "/api/account/shipping",
    });
    return NextResponse.json(
      { error: "Failed to save shipping profile", requestId },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
