// app/api/admin/shipping/origin/route.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdminApi } from "@/lib/auth/session";
import { ShippingOriginsRepository } from "@/repositories/shipping-origins-repo";
import { getRequestIdFromHeaders } from "@/lib/http/request-id";
import { logError } from "@/lib/utils/log";

const originSchema = z
  .object({
    name: z.string().trim().optional().default(""),
    company: z.string().trim().optional().nullable(),
    phone: z.string().trim().optional().nullable(),
    line1: z.string().trim().min(1, "Street address is required."),
    line2: z.string().trim().optional().nullable(),
    city: z.string().trim().min(1, "City is required."),
    state: z.string().trim().min(1, "State is required."),
    postal_code: z.string().trim().min(1, "ZIP / postal code is required."),
    country: z.string().trim().min(1, "Country is required."),
  })
  .superRefine((data, ctx) => {
    const name = data.name?.trim() ?? "";
    const company = data.company?.trim() ?? "";
    if (!name && !company) {
      const message = "Enter a contact name or company.";
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["name"], message });
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["company"], message });
    }
  });

const normalizeOptional = (value?: string | null) => {
  const trimmed = (value ?? "").trim();
  return trimmed ? trimmed : null;
};

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

    const normalized = {
      ...parsed.data,
      name: parsed.data.name.trim(),
      company: normalizeOptional(parsed.data.company),
      phone: normalizeOptional(parsed.data.phone),
      line1: parsed.data.line1.trim(),
      line2: normalizeOptional(parsed.data.line2),
      city: parsed.data.city.trim(),
      state: parsed.data.state.trim(),
      postal_code: parsed.data.postal_code.trim(),
      country: parsed.data.country.trim(),
    };

    const saved = await repo.upsert(normalized);
    return NextResponse.json({ origin: saved });
  } catch (error) {
    logError(error, { layer: "api", requestId, route: "/api/admin/shipping/origin" });
    return NextResponse.json(
      { error: "Failed to save shipping origin", requestId },
      { status: 500 },
    );
  }
}
