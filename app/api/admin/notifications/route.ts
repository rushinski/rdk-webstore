import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/session";
import { AdminNotificationsRepository } from "@/repositories/admin-notifications-repo";
import { adminNotificationUpdateSchema } from "@/lib/validation/admin";
import { getRequestIdFromHeaders } from "@/lib/http/request-id";
import { logError } from "@/lib/log";

export async function GET(request: NextRequest) {
  const requestId = getRequestIdFromHeaders(request.headers);

  try {
    const session = await requireAdmin();
    const supabase = await createSupabaseServerClient();
    const notificationsRepo = new AdminNotificationsRepository(supabase);

    const limitParam = request.nextUrl.searchParams.get("limit");
    const unreadParam = request.nextUrl.searchParams.get("unread");

    const limit = limitParam ? Math.min(Number(limitParam) || 0, 50) : 15;
    const unreadOnly = unreadParam === "1" || unreadParam === "true";

    const notifications = await notificationsRepo.listForAdmin(session.user.id, {
      limit: limit || undefined,
      unreadOnly,
    });

    return NextResponse.json(
      { notifications },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error: any) {
    logError(error, {
      layer: "api",
      requestId,
      route: "/api/admin/notifications",
    });

    return NextResponse.json(
      { error: "Failed to load notifications", requestId },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}

export async function PATCH(request: NextRequest) {
  const requestId = getRequestIdFromHeaders(request.headers);

  try {
    const session = await requireAdmin();
    const body = await request.json().catch(() => null);
    const parsed = adminNotificationUpdateSchema.safeParse(body ?? {});

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.format(), requestId },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    const supabase = await createSupabaseServerClient();
    const notificationsRepo = new AdminNotificationsRepository(supabase);
    const updated = parsed.data.mark_all
      ? await notificationsRepo.markAllRead(session.user.id)
      : await notificationsRepo.markRead(session.user.id, parsed.data.ids ?? []);

    return NextResponse.json(
      { notifications: updated },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error: any) {
    logError(error, {
      layer: "api",
      requestId,
      route: "/api/admin/notifications",
    });

    return NextResponse.json(
      { error: "Failed to update notifications", requestId },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
