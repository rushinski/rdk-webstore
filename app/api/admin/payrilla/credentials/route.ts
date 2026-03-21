// app/api/admin/payrilla/credentials/route.ts
//
// Admin API to configure per-tenant PayRilla credentials.
// Credentials are stored in AWS SSM Parameter Store as SecureString — never in the DB.
//
// GET — Returns whether credentials are configured for the current tenant.
// PUT — Saves/updates credentials in SSM. Also sets profiles.payrilla_account_id
//       so the checkout pricing service knows payment is configured for this tenant.
//
// Required role: super_admin or dev (canViewBank)

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/service-role";
import { requireAdminApi } from "@/lib/auth/session";
import { canViewBank } from "@/config/constants/roles";
import { getRequestIdFromHeaders } from "@/lib/http/request-id";
import { log, logError } from "@/lib/utils/log";
import { TenantContextService } from "@/services/tenant-context-service";
import { ProfileRepository } from "@/repositories/profile-repo";
import { getPayrillaSecret, putPayrillaSecret } from "@/lib/secrets/payrilla-secrets";

const credentialsSchema = z
  .object({
    sourceKey: z.string().min(1),
    pin: z.string().default(""), // Optional — empty string if not set
    tokenizationKey: z.string().min(1),
    webhookSecret: z.string().min(1),
  })
  .strict();

function json(data: Record<string, unknown>, status: number) {
  return NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

export async function GET(request: NextRequest) {
  const requestId = getRequestIdFromHeaders(request.headers);

  try {
    const session = await requireAdminApi();

    if (!canViewBank(session.role)) {
      return json({ error: "Forbidden", requestId }, 403);
    }

    const supabase = await createSupabaseServerClient();
    const contextService = new TenantContextService(supabase);
    const tenantId = await contextService.getTenantId(session.user.id);

    const secret = await getPayrillaSecret(tenantId);

    return json({ configured: !!secret, requestId }, 200);
  } catch (error) {
    logError(error, {
      layer: "api",
      requestId,
      route: "/api/admin/payrilla/credentials",
    });
    return json({ error: "Internal server error", requestId }, 500);
  }
}

export async function PUT(request: NextRequest) {
  const requestId = getRequestIdFromHeaders(request.headers);

  try {
    const session = await requireAdminApi();

    if (!canViewBank(session.role)) {
      return json({ error: "Forbidden", requestId }, 403);
    }

    const body = await request.json().catch(() => null);
    const parsed = credentialsSchema.safeParse(body ?? {});

    if (!parsed.success) {
      return json(
        { error: "Invalid payload", issues: parsed.error.format(), requestId },
        400,
      );
    }

    const supabase = await createSupabaseServerClient();
    const contextService = new TenantContextService(supabase);
    const context = await contextService.getAdminContext(session.user.id);

    await putPayrillaSecret(context.tenantId, {
      sourceKey: parsed.data.sourceKey,
      pin: parsed.data.pin,
      tokenizationKey: parsed.data.tokenizationKey,
      webhookSecret: parsed.data.webhookSecret,
    });

    // Mark the tenant's profile as payment-configured so the checkout pricing
    // service's getPayrillaAccountIdForTenant() check passes.
    const adminSupabase = createSupabaseAdminClient();
    const profileRepo = new ProfileRepository(adminSupabase);
    await profileRepo.setPayrillaAccountId(session.user.id, "configured");

    log({
      level: "info",
      layer: "api",
      message: "payrilla_credentials_updated",
      requestId,
      tenantId: context.tenantId,
    });

    return json({ success: true, requestId }, 200);
  } catch (error) {
    logError(error, {
      layer: "api",
      requestId,
      route: "/api/admin/payrilla/credentials",
    });
    return json({ error: "Internal server error", requestId }, 500);
  }
}
