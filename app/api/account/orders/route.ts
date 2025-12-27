import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/session";
import { OrdersService } from "@/services/orders-service";

export async function GET() {
  try {
    const session = await requireUser();
    const supabase = await createSupabaseServerClient();
    const service = new OrdersService(supabase);

    const orders = await service.listOrdersForUser(session.user.id);
    return NextResponse.json({ orders });
  } catch (error) {
    console.error("Account orders error:", error);
    return NextResponse.json({ error: "Failed to load orders" }, { status: 500 });
  }
}
