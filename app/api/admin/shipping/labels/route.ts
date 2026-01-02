// app/api/admin/shipping/labels/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdminApi } from "@/lib/auth/session";
import { OrdersRepository } from "@/repositories/orders-repo";
import { ShippingOriginsRepository } from "@/repositories/shipping-origins-repo";
import { ProfileRepository } from "@/repositories/profile-repo";
import { ShippingLabelService } from "@/services/shipping-label-service";
import { OrderEmailService } from "@/services/order-email-service";
import { getRequestIdFromHeaders } from "@/lib/http/request-id";
import { logError } from "@/lib/log";

const labelsSchema = z.object({
    orderId: z.string().uuid(),
    rateId: z.string(), // This is the ID of the rate selected by the user
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
        const parsed = labelsSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json({ error: "Invalid payload", issues: parsed.error.format() }, { status: 400 });
        }

        const { orderId, rateId, weight, length, width, height } = parsed.data;

        const ordersRepo = new OrdersRepository(supabase);
        const originsRepo = new ShippingOriginsRepository(supabase);
        const profileRepo = new ProfileRepository(supabase);
        const labelService = new ShippingLabelService();

        const order = await ordersRepo.getById(orderId);
        if (!order) {
            return NextResponse.json({ error: "Order not found" }, { status: 404 });
        }

        // Get recipient address from the order
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
        const label = await labelService.createLabel(shipper, recipient.data, packages, rateId);

        // Save the tracking number to the order
        await ordersRepo.markFulfilled(orderId, {
            carrier: 'UPS', // Hardcoded for now
            trackingNumber: label.trackingNumber,
        });

        // Send email notification to customer
        try {
            if (order.user_id) {
                const profile = await profileRepo.getByUserId(order.user_id);
                if (profile?.email) {
                    const emailService = new OrderEmailService();
                    await emailService.sendOrderShipped({
                        to: profile.email,
                        orderId: order.id,
                        carrier: 'UPS',
                        trackingNumber: label.trackingNumber,
                    });
                }
            }
            // How to handle guest emails? The email is on the Stripe session, but not easily accessible here.
            // This could be a future improvement, e.g. by saving customer email on the order table.
        } catch (emailError) {
            logError(emailError, { layer: "api", requestId, message: "Failed to send shipping confirmation email" });
            // Do not fail the request if email sending fails
        }

        return NextResponse.json({ label });

    } catch (error) {
        logError(error, { layer: "api", requestId, route: "/api/admin/shipping/labels" });
        return NextResponse.json({ error: "Failed to create shipping label." }, { status: 500 });
    }
}
