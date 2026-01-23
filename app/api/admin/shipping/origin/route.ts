// app/api/admin/shipping/origin/route.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdminApi } from "@/lib/auth/session";
import { ShippingOriginsRepository } from "@/repositories/shipping-origins-repo";
import { getRequestIdFromHeaders } from "@/lib/http/request-id";
import { logError } from "@/lib/log";

const originSchema = z.object({
  name: z.string().trim().min(1),
  company: z.string().trim().optional().nullable(),
  phone: z.string().trim().min(1),
  line1: z.string().trim().min(1),
  line2: z.string().trim().optional().nullable(),
  city: z.string().trim().min(1),
  state: z.string().trim().min(1),
  postal_code: z.string().trim().min(1),
  country: z.string().trim().min(1),
});

export async function GET(request: NextRequest) {
  const requestId = getRequestIdFromHeaders(request.headers);

  try {
    await requireAdminApi();
    const supabase = await createSupabaseServerClient();
    const repo = new ShippingOriginsRepository(supabase);

    const origin = await repo.get();
    return NextResponse.json({ origin });
  } catch (error) {
    logError(error, { layer: "api", requestId, route: "/api/admin/shipping/origin" });
    return NextResponse.json(
      { error: "Failed to fetch shipping origin", requestId },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const requestId = getRequestIdFromHeaders(request.headers);

  try {
    await requireAdminApi();
    const supabase = await createSupabaseServerClient();
    const repo = new ShippingOriginsRepository(supabase);

    const body = await request.json();
    const parsed = originSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.format(), requestId },
        { status: 400 },
      );
    }

    const saved = await repo.upsert(parsed.data);
    return NextResponse.json({ origin: saved });
  } catch (error) {
    logError(error, { layer: "api", requestId, route: "/api/admin/shipping/origin" });
    return NextResponse.json(
      { error: "Failed to save shipping origin", requestId },
      { status: 500 },
    );
  }
}
