import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/session";
import { OrdersRepository } from "@/repositories/orders-repo";

export async function POST(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    await requireAdmin();
    const supabase = await createSupabaseServerClient();
    const repo = new OrdersRepository(supabase);

    const body = await request.json().catch(() => ({}));
    const carrier = typeof body?.carrier === "string" ? body.carrier : null;
    const trackingNumber = typeof body?.trackingNumber === "string" ? body.trackingNumber : null;

    const updated = await repo.markFulfilled(params.orderId, { carrier, trackingNumber });

    return NextResponse.json({ order: updated });
  } catch (error) {
    console.error("Admin fulfill error:", error);
    return NextResponse.json({ error: "Failed to fulfill order" }, { status: 500 });
  }
}
