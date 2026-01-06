// app/api/admin/shipping/labels/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdminApi } from "@/lib/auth/session";
import { OrdersRepository } from "@/repositories/orders-repo";
import { ProfileRepository } from "@/repositories/profile-repo";
import { EasyPostService } from "@/services/shipping-label-service";
import { OrderEmailService } from "@/services/order-email-service";
import { getRequestIdFromHeaders } from "@/lib/http/request-id";
import { logError } from "@/lib/log";

const labelsSchema = z.object({
    orderId: z.string().uuid(),
    shipmentId: z.string(),
    rateId: z.string(),
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

        const { orderId, shipmentId, rateId } = parsed.data;

        const ordersRepo = new OrdersRepository(supabase);
        const profilesRepo = new ProfileRepository(supabase);
        const easyPostService = new EasyPostService();

        const order = await ordersRepo.getById(orderId);
        if (!order) {
            return NextResponse.json({ error: "Order not found", requestId }, { status: 404 });
        }
        
        // Purchase the label from EasyPost
        const purchasedShipment = await easyPostService.purchaseLabel(shipmentId, rateId);

        // Mark order as ready to ship with carrier and tracking info
        await ordersRepo.markReadyToShip(orderId, {
            carrier: purchasedShipment.carrier,
            trackingNumber: purchasedShipment.tracking_code,
        });

        // Send "Label Created" email to customer
        try {
            if (order.user_id) {
                const profile = await profilesRepo.getByUserId(order.user_id);
                if (profile?.email) {
                    const emailService = new OrderEmailService();
                    await emailService.sendOrderLabelCreated({
                        to: profile.email,
                        orderId: order.id,
                        carrier: purchasedShipment.carrier ?? null,
                        trackingNumber: purchasedShipment.tracking_code ?? null,
                        trackingUrl: purchasedShipment.tracker?.public_url ?? null,
                    });
                }
            }
        } catch (emailError) {
            logError(emailError, { layer: "api", requestId, message: "Failed to send label created email" });
            // Don't fail the label creation if email fails
        }

        return NextResponse.json({
            label: purchasedShipment.postage_label,
            trackingCode: purchasedShipment.tracking_code,
            trackingUrl: purchasedShipment.tracker?.public_url ?? null,
        });

    } catch (error: any) {
        logError(error, { layer: "api", requestId, route: "/api/admin/shipping/labels" });
        return NextResponse.json({ error: error.message || "Failed to create shipping label." }, { status: 500 });
    }
}