// app/api/admin/shipping/rates/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdminApi } from "@/lib/auth/session";
import { OrdersRepository } from "@/repositories/orders-repo";
import { ShippingOriginsRepository } from "@/repositories/shipping-origins-repo";
import { ShippingLabelService } from "@/services/shipping-label-service";
import { getRequestIdFromHeaders } from "@/lib/http/request-id";
import { logError } from "@/lib/log";

const ratesSchema = z.object({
    orderId: z.string().uuid(),
    weight: z.number().positive(),
    length: z.number().positive(),
    width: z.number().positive(),
    height: z.number().positive(),
});

export async function POST(request: NextRequest) {
    const requestId = getRequestIdFromHeaders(request.headers);
    try {
        await requireAdminApi();
        const supabase = await createSupabaseServerClient();
        
        const body = await request.json();
        const parsed = ratesSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json({ error: "Invalid payload", issues: parsed.error.format() }, { status: 400 });
        }

        const { orderId, weight, length, width, height } = parsed.data;

        const ordersRepo = new OrdersRepository(supabase);
        const originsRepo = new ShippingOriginsRepository(supabase);
        const labelService = new ShippingLabelService();

        // Get recipient address from the order
        const order = await ordersRepo.getById(orderId);
        const recipient = await supabase.from('order_shipping').select('*').eq('order_id', orderId).single();
        if (!recipient.data) {
            return NextResponse.json({ error: "Recipient address not found for this order." }, { status: 404 });
        }

        // Get shipper address from settings
        const shipper = await originsRepo.get();
        if (!shipper) {
            return NextResponse.json({ error: "Shipping origin address not configured in settings." }, { status: 400 });
        }

        const packages = [{ weight, length, width, height }];

        // NOTE: This currently returns mock data from the placeholder service
        const rates = await labelService.getRates(shipper, recipient.data, packages);

        return NextResponse.json({ rates });

    } catch (error) {
        logError(error, { layer: "api", requestId, route: "/api/admin/shipping/rates" });
        return NextResponse.json({ error: "Failed to fetch shipping rates." }, { status: 500 });
    }
}
