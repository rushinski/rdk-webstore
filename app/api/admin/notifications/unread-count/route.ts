import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdminApi } from "@/lib/auth/session";
import { AdminNotificationService } from "@/services/admin-notification-service";
import { getRequestIdFromHeaders } from "@/lib/http/request-id";
import { logError } from "@/lib/log";

export async function GET(request: NextRequest) {
  const requestId = getRequestIdFromHeaders(request.headers);

  try {
    const session = await requireAdminApi();
    const supabase = await createSupabaseServerClient();
    const svc = new AdminNotificationService(supabase);

    const unreadCount = await svc.unreadCount(session.user.id);

    return NextResponse.json({ unreadCount }, { headers: { "Cache-Control": "no-store" } });
  } catch (error: any) {
    logError(error, { layer: "api", requestId, route: "/api/admin/notifications/unread-count" });
    return NextResponse.json(
      { error: "Failed to load unread count", requestId },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
