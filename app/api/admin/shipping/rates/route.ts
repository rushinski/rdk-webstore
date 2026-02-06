// app/api/admin/shipping/rates/route.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import { createSupabaseAdminClient } from "@/lib/supabase/service-role";
import { requireAdminApi } from "@/lib/auth/session";
import { ShippingOriginsRepository } from "@/repositories/shipping-origins-repo";
import { ShippingCarriersRepository } from "@/repositories/shipping-carriers-repo";
import { AddressesRepository } from "@/repositories/addresses-repo";
import { ShippoService } from "@/services/shipping-label-service";
import { getRequestIdFromHeaders } from "@/lib/http/request-id";
import { logError } from "@/lib/utils/log";

export const dynamic = "force-dynamic";

const noStoreHeaders = { "Cache-Control": "no-store" };

const recipientSchema = z
  .object({
    name: z.string().trim().optional().nullable(),
    phone: z.string().trim().optional().nullable(),
    line1: z.string().trim().min(1),
    line2: z.string().trim().optional().nullable(),
    city: z.string().trim().min(1),
    state: z.string().trim().min(1),
    postal_code: z.string().trim().min(1),
    country: z.string().trim().min(1),
  })
  .strict();

const ratesSchema = z
  .object({
    orderId: z.string().uuid(),
    weight: z.number().positive(),
    length: z.number().positive(),
    width: z.number().positive(),
    height: z.number().positive(),
    recipient: recipientSchema.optional(),
  })
  .strict();

const normalizeCarrier = (v: unknown) =>
  String(v ?? "")
    .trim()
    .toUpperCase();

const toShippoAddress = (address: {
  name?: string | null;
  company?: string | null;
  phone?: string | null;
  line1?: string | null;
  line2?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  country?: string | null;
}) => {
  const clean = (value?: string | null) => {
    const trimmed = (value ?? "").trim();
    return trimmed ? trimmed : undefined;
  };

  if (
    !address.line1 ||
    !address.city ||
    !address.state ||
    !address.postal_code ||
    !address.country
  ) {
    return null;
  }

  return {
    name: clean(address.name),
    company: clean(address.company),
    phone: clean(address.phone),
    street1: address.line1,
    street2: address.line2 ?? undefined,
    city: address.city,
    state: address.state,
    zip: address.postal_code,
    country: address.country,
  };
};

export async function POST(request: NextRequest) {
  const requestId = getRequestIdFromHeaders(request.headers);

  try {
    await requireAdminApi();

    const supabase = await createSupabaseAdminClient();

    const body = await request.json().catch(() => null);
    const parsed = ratesSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.format(), requestId },
        { status: 400, headers: noStoreHeaders },
      );
    }

    const { orderId, weight, length, width, height, recipient } = parsed.data;

    const originsRepo = new ShippingOriginsRepository(supabase);
    const carriersRepo = new ShippingCarriersRepository(supabase);
    const addressesRepo = new AddressesRepository(supabase);
    const shippoService = new ShippoService();

    // Get enabled carriers
    const carriersConfig = await carriersRepo.get();
    const enabledCarriers = (carriersConfig?.enabled_carriers ?? [])
      .map(normalizeCarrier)
      .filter(Boolean);

    const enabledSet = new Set(enabledCarriers);

    if (enabledSet.size === 0) {
      return NextResponse.json(
        {
          error: "No carriers enabled. Please enable carriers in shipping settings.",
          requestId,
        },
        { status: 400, headers: noStoreHeaders },
      );
    }

    // Get recipient address
    const recipientSource = recipient ?? (await addressesRepo.getOrderShipping(orderId));
    if (!recipientSource) {
      return NextResponse.json(
        { error: "Recipient address not found for this order.", requestId },
        { status: 404, headers: noStoreHeaders },
      );
    }

    const recipientAddress = toShippoAddress(recipientSource);
    if (!recipientAddress) {
      return NextResponse.json(
        { error: "Recipient address is incomplete.", requestId },
        { status: 400, headers: noStoreHeaders },
      );
    }

    // Get shipper address
    const shipper = await originsRepo.get();
    if (!shipper) {
      return NextResponse.json(
        { error: "Shipping origin address not configured in settings.", requestId },
        { status: 400, headers: noStoreHeaders },
      );
    }

    const shipperAddress = toShippoAddress(shipper);
    if (!shipperAddress) {
      return NextResponse.json(
        { error: "Shipping origin address is incomplete.", requestId },
        { status: 400, headers: noStoreHeaders },
      );
    }

    // Create shipment and get rates
    const parcel = { weight, length, width, height };
    const normalizedShipment = await shippoService.createShipment(
      shipperAddress,
      recipientAddress,
      parcel,
    );

    if (!normalizedShipment.id) {
      return NextResponse.json(
        { error: "Shippo shipment creation failed: missing shipment ID", requestId },
        { status: 502, headers: noStoreHeaders },
      );
    }

    // Filter rates by enabled carriers
    const filteredRates = normalizedShipment.rates.filter((rate) => {
      const provider = normalizeCarrier(rate.carrier);
      return enabledSet.has(provider);
    });

    if (filteredRates.length === 0) {
      return NextResponse.json(
        {
          error:
            "No rates available for enabled carriers. Check your carrier settings or try different package dimensions.",
          requestId,
        },
        { status: 400, headers: noStoreHeaders },
      );
    }

    // Map to UI format (already normalized, but keep for compatibility)
    const uiRates = filteredRates.map((r) => ({
      id: r.id,
      carrier: r.carrier,
      service: r.service,
      rate: r.rate,
      currency: r.currency,
      estimated_delivery_days: r.estimated_delivery_days,
      delivery_days: r.estimated_delivery_days,
    }));

    return NextResponse.json(
      {
        shipment: {
          id: normalizedShipment.id,
          rates: uiRates,
        },
      },
      { headers: noStoreHeaders },
    );
  } catch (error: unknown) {
    logError(error, { layer: "api", requestId, route: "/api/admin/shipping/rates" });

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to fetch shipping rates.",
        requestId,
      },
      { status: 500, headers: noStoreHeaders },
    );
  }
}
