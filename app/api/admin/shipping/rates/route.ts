// app/api/admin/shipping/rates/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdminApi } from "@/lib/auth/session";
import { ShippingOriginsRepository } from "@/repositories/shipping-origins-repo";
import { EasyPostService } from "@/services/shipping-label-service";
import { getRequestIdFromHeaders } from "@/lib/http/request-id";
import { logError } from "@/lib/log";

const ratesSchema = z
  .object({
    orderId: z.string().uuid(),
    weight: z.number().positive(),
    length: z.number().positive(),
    width: z.number().positive(),
    height: z.number().positive(),
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
            return NextResponse.json({ error: "Invalid payload", issues: parsed.error.format() }, { status: 400 });
        }

        const { orderId, weight, length, width, height } = parsed.data;

        const originsRepo = new ShippingOriginsRepository(supabase);
        const easyPostService = new EasyPostService();

        // Get recipient address from the order
        const recipientResult = await supabase.from('order_shipping').select('*').eq('order_id', orderId).single();
        if (!recipientResult.data) {
            return NextResponse.json({ error: "Recipient address not found for this order." }, { status: 404 });
        }
        const recipient = recipientResult.data;
        const recipientAddress = toEasyPostAddress(recipient);
        if (!recipientAddress) {
            return NextResponse.json({ error: "Recipient address is incomplete." }, { status: 400 });
        }

        // Get shipper address from settings
        const shipper = await originsRepo.get();
        if (!shipper) {
            return NextResponse.json({ error: "Shipping origin address not configured in settings." }, { status: 400 });
        }
        const shipperAddress = toEasyPostAddress(shipper);
        if (!shipperAddress) {
            return NextResponse.json({ error: "Shipping origin address is incomplete." }, { status: 400 });
        }

        const parcel = { weight, length, width, height };

        const shipment = await easyPostService.createShipment(shipperAddress, recipientAddress, parcel);

        return NextResponse.json({ shipment });

    } catch (error: any) {
        logError(error, { layer: "api", requestId, route: "/api/admin/shipping/rates" });
        return NextResponse.json({ error: error.message || "Failed to fetch shipping rates." }, { status: 500 });
    }
}
