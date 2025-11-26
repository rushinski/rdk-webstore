import { NextRequest, NextResponse } from "next/server";
import { createRlsClient } from "@/lib/supabase";
import { OrdersRepo } from "@/repositories/orders-repo";
import { ProfilesRepo } from "@/repositories/profiles-repo";
import { OrderService } from "@/services/order-service";

export async function GET(req: NextRequest) {
  const requestId = crypto.randomUUID();
  const token = req.headers.get("Authorization")?.replace("Bearer ", "") ?? null;

  const supabase = createRlsClient(token ?? undefined, requestId);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const service = new OrderService({
    repos: {
      orders: new OrdersRepo({ supabase, requestId, userId: user.id }),
      profiles: new ProfilesRepo({ supabase, requestId, userId: user.id }),
    },
    requestId,
    userId: user.id,
  });

  const data = await service.listUserOrders(user.id);

  return NextResponse.json({ data, requestId });
}
