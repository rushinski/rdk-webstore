import { NextRequest, NextResponse } from "next/server";
import { createRlsClient } from "@/lib/supabase";
import { OrdersRepo } from "@/repositories/orders-repo";
import { ProfilesRepo } from "@/repositories/profiles-repo";
import { OrderService } from "@/services/order-service";
import { z } from "zod";

const bodySchema = z.object({
  userId: z.string().uuid(),
  subtotal: z.number(),
  shipping: z.number(),
  total: z.number(),
  stripeSessionId: z.string(),
});

export async function POST(req: NextRequest) {
  const requestId = crypto.randomUUID();
  const token = req.headers.get("Authorization")?.replace("Bearer ", "") ?? null;

  const supabase = createRlsClient(token ?? undefined, requestId);

  const body = bodySchema.parse(await req.json());

  const orders = new OrdersRepo({ supabase, requestId, userId: body.userId });
  const profiles = new ProfilesRepo({ supabase, requestId, userId: body.userId });

  const service = new OrderService({
    repos: { orders, profiles },
    requestId,
    userId: body.userId,
  });

  const result = await service.createPendingOrder(body);

  return NextResponse.json({ data: result, requestId });
}
