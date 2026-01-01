// app/api/account/addresses/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireUserApi } from "@/lib/auth/session";
import { AddressesRepository } from "@/repositories/addresses-repo";
import { getRequestIdFromHeaders } from "@/lib/http/request-id";
import { logError } from "@/lib/log";

const optionalText = z.preprocess(
  (value) => {
    if (typeof value !== "string") return value;
    const trimmed = value.trim();
    return trimmed.length === 0 ? null : trimmed;
  },
  z.string().trim().min(1).nullable().optional()
);

const requiredText = z.string().trim().min(1);

const addressSchema = z
  .object({
    name: optionalText,
    phone: optionalText,
    line1: requiredText,
    line2: optionalText,
    city: requiredText,
    state: requiredText,
    postal_code: requiredText,
    country: requiredText,
  })
  .strict();

export async function GET(request: NextRequest) {
  const requestId = getRequestIdFromHeaders(request.headers);

  try {
    const session = await requireUserApi();
    const supabase = await createSupabaseServerClient();
    const repo = new AddressesRepository(supabase);

    const addresses = await repo.listUserAddresses(session.user.id);
    return NextResponse.json(
      { addresses },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    logError(error, {
      layer: "api",
      requestId,
      route: "/api/account/addresses",
    });
    return NextResponse.json(
      { error: "Failed to load addresses", requestId },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}

export async function POST(request: NextRequest) {
  const requestId = getRequestIdFromHeaders(request.headers);

  try {
    const session = await requireUserApi();
    const supabase = await createSupabaseServerClient();
    const repo = new AddressesRepository(supabase);

    const body = await request.json().catch(() => null);
    const parsed = addressSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.format(), requestId },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    await repo.upsertUserAddress(session.user.id, {
      name: parsed.data.name ?? null,
      phone: parsed.data.phone ?? null,
      line1: parsed.data.line1,
      line2: parsed.data.line2 ?? null,
      city: parsed.data.city,
      state: parsed.data.state,
      postalCode: parsed.data.postal_code,
      country: parsed.data.country,
    });

    const addresses = await repo.listUserAddresses(session.user.id);
    return NextResponse.json(
      { addresses },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    logError(error, {
      layer: "api",
      requestId,
      route: "/api/account/addresses",
    });
    return NextResponse.json(
      { error: "Failed to save address", requestId },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
