// app/api/admin/tax-settings/route.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdminApi } from "@/lib/auth/session";
import { getRequestIdFromHeaders } from "@/lib/http/request-id";
import { logError } from "@/lib/log";
import { TenantContextService } from "@/services/tenant-context-service";
import { TaxSettingsRepository } from "@/repositories/tax-settings-repo";
import { StripeTaxService } from "@/services/stripe-tax-service";
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

    const contextService = new TenantContextService(supabase);
    const tenantId = await contextService.getTenantId(session.user.id);

    const repo = new TaxSettingsRepository(supabase);
    const settings = await repo.getByTenant(tenantId);

    return NextResponse.json(
      {
        settings: {
          taxEnabled: settings?.tax_enabled ?? false,
          taxCodeOverrides: settings?.tax_code_overrides ?? {},
        },
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error: unknown) {
    logError(error, { layer: "api", requestId, route: "/api/admin/tax-settings" });
    const message =
      error instanceof Error ? error.message : "Failed to load tax settings";
    return NextResponse.json(
      { error: message, requestId },
      {
        status: message.includes("not found") ? 404 : 500,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
}

export async function POST(request: NextRequest) {
  const requestId = getRequestIdFromHeaders(request.headers);

  try {
    const session = await requireAdminApi();
    const supabase = await createSupabaseServerClient();

    const contextService = new TenantContextService(supabase);
    const context = await contextService.getAdminContext(session.user.id);

    const body = await request.json().catch(() => null);
    const parsed = taxSettingsSchema.safeParse(body ?? {});

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.format(), requestId },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }

    // Filter tax code overrides to only allowed categories
    const incomingOverrides = parsed.data.taxCodeOverrides ?? {};
    const filteredOverrides: Record<string, string> = {};
    for (const [category, code] of Object.entries(incomingOverrides)) {
      if (!allowedCategories.has(category)) {
        continue;
      }
      const cleaned = String(code ?? "").trim();
      if (!cleaned) {
        continue;
      }
      filteredOverrides[category] = cleaned;
    }

    const repo = new TaxSettingsRepository(supabase);
    const existing = await repo.getByTenant(context.tenantId);

    // If disabling tax, deactivate all Stripe Tax registrations for this tenant's Connect account
    if (parsed.data.taxEnabled === false) {
      const stripeTax = new StripeTaxService(supabase, context.stripeAccountId);
      await stripeTax.deactivateStripeTaxRegistrations();
    }

    const updated = await repo.upsert({
      tenantId: context.tenantId,
      homeState: existing?.home_state ?? "N/A",
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
  } catch (error: unknown) {
    logError(error, { layer: "api", requestId, route: "/api/admin/tax-settings" });
    const message =
      error instanceof Error ? error.message : "Failed to save tax settings";
    return NextResponse.json(
      { error: message, requestId },
      {
        status: message.includes("not configured") ? 400 : 500,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
}
