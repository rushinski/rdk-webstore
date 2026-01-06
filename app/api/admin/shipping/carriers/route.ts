// app/api/admin/shipping/carriers/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdminApi } from "@/lib/auth/session";
import { ShippingCarriersRepository } from "@/repositories/shipping-carriers-repo";
import { getRequestIdFromHeaders } from "@/lib/http/request-id";
import { logError } from "@/lib/log";

const carriersSchema = z.object({
  carriers: z.array(z.string()).default([]),
});

export async function GET(request: NextRequest) {
  const requestId = getRequestIdFromHeaders(request.headers);

  try {
    await requireAdminApi();
    const supabase = await createSupabaseServerClient();
    const repo = new ShippingCarriersRepository(supabase);

    const carriers = await repo.get();
    return NextResponse.json({ carriers: carriers?.enabled_carriers || [] });
  } catch (error) {
    logError(error, { layer: "api", requestId, route: "/api/admin/shipping/carriers" });
    return NextResponse.json(
      { error: "Failed to fetch enabled carriers", requestId },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const requestId = getRequestIdFromHeaders(request.headers);

  try {
    await requireAdminApi();
    const supabase = await createSupabaseServerClient();
    const repo = new ShippingCarriersRepository(supabase);

    const body = await request.json();
    const parsed = carriersSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.format(), requestId },
        { status: 400 }
      );
    }

    const saved = await repo.upsert(parsed.data.carriers);
    return NextResponse.json({ carriers: saved.enabled_carriers });
  } catch (error) {
    logError(error, { layer: "api", requestId, route: "/api/admin/shipping/carriers" });
    return NextResponse.json(
      { error: "Failed to save enabled carriers", requestId },
      { status: 500 }
    );
  }
}