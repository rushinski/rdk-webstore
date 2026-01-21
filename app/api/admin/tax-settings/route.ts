// app/api/admin/tax-settings/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdminApi } from "@/lib/auth/session";
import { getRequestIdFromHeaders } from "@/lib/http/request-id";
import { logError } from "@/lib/log";
import { ProfileRepository } from "@/repositories/profile-repo";
import { TaxSettingsRepository } from "@/repositories/tax-settings-repo";
import { PRODUCT_TAX_CODES } from "@/config/constants/nexus-thresholds";

const taxSettingsSchema = z
  .object({
    taxEnabled: z.boolean(),
    taxCodeOverrides: z.record(z.string(), z.string()).optional(),
  })
  .strict();

const allowedCategories = new Set(Object.keys(PRODUCT_TAX_CODES));

export async function GET(request: NextRequest) {
  const requestId = getRequestIdFromHeaders(request.headers);

  try {
    const session = await requireAdminApi();
    const supabase = await createSupabaseServerClient();
    const profileRepo = new ProfileRepository(supabase);
    const profile = await profileRepo.getByUserId(session.user.id);

    if (!profile?.tenant_id) {
      return NextResponse.json({ error: "Tenant not found", requestId }, { status: 404 });
    }

    const repo = new TaxSettingsRepository(supabase);
    const settings = await repo.getByTenant(profile.tenant_id);

    return NextResponse.json(
      {
        settings: {
          taxEnabled: settings?.tax_enabled ?? true,
          taxCodeOverrides: settings?.tax_code_overrides ?? {},
        },
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error: any) {
    logError(error, { layer: "api", requestId, route: "/api/admin/tax-settings" });
    return NextResponse.json(
      { error: "Failed to load tax settings", requestId },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}

export async function POST(request: NextRequest) {
  const requestId = getRequestIdFromHeaders(request.headers);

  try {
    const session = await requireAdminApi();
    const supabase = await createSupabaseServerClient();
    const profileRepo = new ProfileRepository(supabase);
    const profile = await profileRepo.getByUserId(session.user.id);

    if (!profile?.tenant_id) {
      return NextResponse.json({ error: "Tenant not found", requestId }, { status: 404 });
    }

    const body = await request.json().catch(() => null);
    const parsed = taxSettingsSchema.safeParse(body ?? {});

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.format(), requestId },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }

    const incomingOverrides = parsed.data.taxCodeOverrides ?? {};
    const filteredOverrides: Record<string, string> = {};
    for (const [category, code] of Object.entries(incomingOverrides)) {
      if (!allowedCategories.has(category)) continue;
      const cleaned = String(code ?? "").trim();
      if (!cleaned) continue;
      filteredOverrides[category] = cleaned;
    }

    const repo = new TaxSettingsRepository(supabase);
    const existing = await repo.getByTenant(profile.tenant_id);

    const updated = await repo.upsert({
      tenantId: profile.tenant_id,
      homeState: existing?.home_state ?? "SC",
      businessName: existing?.business_name ?? null,
      taxIdNumber: existing?.tax_id_number ?? null,
      stripeTaxSettingsId: existing?.stripe_tax_settings_id ?? null,
      taxEnabled: parsed.data.taxEnabled,
      taxCodeOverrides: filteredOverrides,
    });

    return NextResponse.json(
      {
        settings: {
          taxEnabled: updated.tax_enabled,
          taxCodeOverrides: updated.tax_code_overrides ?? {},
        },
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error: any) {
    logError(error, { layer: "api", requestId, route: "/api/admin/tax-settings" });
    return NextResponse.json(
      { error: "Failed to save tax settings", requestId },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
