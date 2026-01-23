// app/api/admin/shipping/carriers/route.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import { createSupabaseAdminClient } from "@/lib/supabase/service-role";
import { requireAdminApi } from "@/lib/auth/session";
import { ShippingCarriersRepository } from "@/repositories/shipping-carriers-repo";
import { getRequestIdFromHeaders } from "@/lib/http/request-id";
import { logError } from "@/lib/log";

export const dynamic = "force-dynamic";

const carriersSchema = z
  .object({
    carriers: z.array(z.string()).default([]),
  })
  .strict();

function toError(err: unknown): Error {
  if (err instanceof Error) {
    return err;
  }
  if (typeof err === "string") {
    return new Error(err);
  }
  try {
    return new Error(JSON.stringify(err));
  } catch {
    return new Error(String(err));
  }
}

const noStoreHeaders = { "Cache-Control": "no-store" };

export async function GET(request: NextRequest) {
  const requestId = getRequestIdFromHeaders(request.headers);

  try {
    await requireAdminApi();

    const supabase = await createSupabaseAdminClient();
    const repo = new ShippingCarriersRepository(supabase);

    const row = await repo.get();
    return NextResponse.json(
      { carriers: row?.enabled_carriers || [] },
      { headers: noStoreHeaders },
    );
  } catch (err) {
    const error = toError(err);
    logError(error, {
      layer: "api",
      requestId,
      route: "/api/admin/shipping/carriers",
      method: "GET",
    });

    return NextResponse.json(
      { error: error.message || "Failed to fetch enabled carriers", requestId },
      { status: 500, headers: noStoreHeaders },
    );
  }
}

export async function POST(request: NextRequest) {
  const requestId = getRequestIdFromHeaders(request.headers);

  try {
    await requireAdminApi();

    const supabase = await createSupabaseAdminClient();
    const repo = new ShippingCarriersRepository(supabase);

    const body = await request.json().catch(() => null);
    const parsed = carriersSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.format(), requestId },
        { status: 400, headers: noStoreHeaders },
      );
    }

    // Normalize & dedupe
    const normalizeCarrier = (v: unknown) =>
      String(v ?? "")
        .trim()
        .toUpperCase();

    const carriers = Array.from(
      new Set(parsed.data.carriers.map(normalizeCarrier).filter(Boolean)),
    );

    const saved = await repo.upsert(carriers);
    return NextResponse.json(
      { carriers: saved.enabled_carriers || [] },
      { headers: noStoreHeaders },
    );
  } catch (err) {
    const error = toError(err);
    logError(error, {
      layer: "api",
      requestId,
      route: "/api/admin/shipping/carriers",
      method: "POST",
    });

    return NextResponse.json(
      { error: error.message || "Failed to save enabled carriers", requestId },
      { status: 500, headers: noStoreHeaders },
    );
  }
}
