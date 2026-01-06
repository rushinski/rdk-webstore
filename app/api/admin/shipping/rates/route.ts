// app/api/admin/shipping/rates/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { requireAdminApi } from '@/lib/auth/session';
import { ShippingOriginsRepository } from '@/repositories/shipping-origins-repo';
import { ShippingCarriersRepository } from '@/repositories/shipping-carriers-repo';
import { AddressesRepository } from '@/repositories/addresses-repo';
import { EasyPostService } from '@/services/shipping-label-service';
import { getRequestIdFromHeaders } from '@/lib/http/request-id';
import { logError } from '@/lib/log';

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
    recipient: recipientSchema.optional(), // NEW
  })
  .strict();

const toEasyPostAddress = (address: {
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
  if (!address.line1 || !address.city || !address.state || !address.postal_code || !address.country) {
    return null;
  }

  return {
    name: address.name ?? null,
    company: address.company ?? null,
    phone: address.phone ?? null,
    street1: address.line1,
    street2: address.line2 ?? null,
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
    const supabase = await createSupabaseServerClient();

    const body = await request.json().catch(() => null);
    const parsed = ratesSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload', issues: parsed.error.format(), requestId }, { status: 400 });
    }

    const { orderId, weight, length, width, height, recipient } = parsed.data;

    const originsRepo = new ShippingOriginsRepository(supabase);
    const carriersRepo = new ShippingCarriersRepository(supabase);
    const addressesRepo = new AddressesRepository(supabase);
    const easyPostService = new EasyPostService();

    const carriersConfig = await carriersRepo.get();
    const enabledCarriers = carriersConfig?.enabled_carriers || [];

    if (enabledCarriers.length === 0) {
      return NextResponse.json(
        { error: 'No carriers enabled. Please enable carriers in shipping settings.', requestId },
        { status: 400 }
      );
    }

    // Recipient: use override from UI if provided, else fall back to order_shipping snapshot
    const recipientSource = recipient ?? (await addressesRepo.getOrderShipping(orderId));
    if (!recipientSource) {
      return NextResponse.json({ error: 'Recipient address not found for this order.', requestId }, { status: 404 });
    }

    const recipientAddress = toEasyPostAddress(recipientSource as any);
    if (!recipientAddress) {
      return NextResponse.json({ error: 'Recipient address is incomplete.', requestId }, { status: 400 });
    }

    const shipper = await originsRepo.get();
    if (!shipper) {
      return NextResponse.json({ error: 'Shipping origin address not configured in settings.', requestId }, { status: 400 });
    }
    const shipperAddress = toEasyPostAddress(shipper as any);
    if (!shipperAddress) {
      return NextResponse.json({ error: 'Shipping origin address is incomplete.', requestId }, { status: 400 });
    }

    const parcel = { weight, length, width, height };
    const shipment = await easyPostService.createShipment(shipperAddress, recipientAddress, parcel);

    const filteredRates = (shipment.rates ?? []).filter((r: any) => {
      const carrier = String(r.carrier ?? '').toUpperCase();
      return enabledCarriers.some((enabled) => enabled.toUpperCase() === carrier);
    });

    return NextResponse.json({
      shipment: {
        id: shipment.id,
        rates: filteredRates,
      },
    });
  } catch (error: any) {
    logError(error, { layer: 'api', requestId, route: '/api/admin/shipping/rates' });
    return NextResponse.json({ error: error.message || 'Failed to fetch shipping rates.', requestId }, { status: 500 });
  }
}
