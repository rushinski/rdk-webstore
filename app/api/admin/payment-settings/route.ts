// app/api/admin/payment-settings/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdminApi } from "@/lib/auth/session";
import { getRequestIdFromHeaders } from "@/lib/http/request-id";
import { logError } from "@/lib/log";
import { ProfileRepository } from "@/repositories/profile-repo";
import { PaymentSettingsRepository } from "@/repositories/payment-settings-repo";
import {
  DEFAULT_EXPRESS_CHECKOUT_METHODS,
  EXPRESS_CHECKOUT_METHODS,
  PAYMENT_METHOD_TYPES,
} from "@/config/constants/payment-options";

const paymentMethodTypeKeys = new Set(PAYMENT_METHOD_TYPES.map((method) => method.key));
const expressMethodKeys = new Set(EXPRESS_CHECKOUT_METHODS.map((method) => method.key));

const paymentSettingsSchema = z
  .object({
    useAutomaticPaymentMethods: z.boolean(),
    paymentMethodTypes: z.array(z.string()).optional(),
    expressCheckoutMethods: z.array(z.string()).optional(),
  })
  .strict();

const normalizeMethods = (input: string[] | undefined, allowed: Set<string>) =>
  (input ?? []).filter((method) => allowed.has(method));

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

    const repo = new PaymentSettingsRepository(supabase);
    const settings = await repo.getByTenant(profile.tenant_id);

    return NextResponse.json(
      {
        settings: {
          useAutomaticPaymentMethods: settings?.use_automatic_payment_methods ?? true,
          paymentMethodTypes: settings?.payment_method_types ?? [],
          expressCheckoutMethods:
            settings?.express_checkout_methods?.length
              ? settings.express_checkout_methods
              : DEFAULT_EXPRESS_CHECKOUT_METHODS,
        },
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error: any) {
    logError(error, { layer: "api", requestId, route: "/api/admin/payment-settings" });
    return NextResponse.json(
      { error: "Failed to load payment settings", requestId },
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
    const parsed = paymentSettingsSchema.safeParse(body ?? {});

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.format(), requestId },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }

    const useAutomaticPaymentMethods = parsed.data.useAutomaticPaymentMethods;
    const paymentMethodTypes = normalizeMethods(parsed.data.paymentMethodTypes, paymentMethodTypeKeys);
    const expressCheckoutMethods = normalizeMethods(
      parsed.data.expressCheckoutMethods,
      expressMethodKeys,
    );

    if (!useAutomaticPaymentMethods && !paymentMethodTypes.includes("card")) {
      paymentMethodTypes.unshift("card");
    }

    const repo = new PaymentSettingsRepository(supabase);
    const updated = await repo.upsert({
      tenantId: profile.tenant_id,
      useAutomaticPaymentMethods,
      paymentMethodTypes,
      expressCheckoutMethods:
        expressCheckoutMethods.length > 0
          ? expressCheckoutMethods
          : DEFAULT_EXPRESS_CHECKOUT_METHODS,
    });

    return NextResponse.json(
      {
        settings: {
          useAutomaticPaymentMethods: updated.use_automatic_payment_methods,
          paymentMethodTypes: updated.payment_method_types,
          expressCheckoutMethods: updated.express_checkout_methods,
        },
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error: any) {
    logError(error, { layer: "api", requestId, route: "/api/admin/payment-settings" });
    return NextResponse.json(
      { error: "Failed to save payment settings", requestId },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
