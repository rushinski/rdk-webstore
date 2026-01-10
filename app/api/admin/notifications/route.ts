import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdminApi } from "@/lib/auth/session";
import { AdminNotificationService } from "@/services/admin-notification-service";
import { getRequestIdFromHeaders } from "@/lib/http/request-id";
import { logError } from "@/lib/log";
import { z } from "zod";
import { adminNotificationUpdateSchema, adminNotificationsQuerySchema } from "@/lib/validation/admin";

const deleteSchema = z.union([
  z.object({ ids: z.array(z.string().uuid()).min(1) }),
  z.object({ delete_all: z.literal(true) }),
]);

export async function GET(request: NextRequest) {
  const requestId = getRequestIdFromHeaders(request.headers);

  try {
    const session = await requireAdminApi();
    const supabase = await createSupabaseServerClient();
    const svc = new AdminNotificationService(supabase);

    const limitParam = request.nextUrl.searchParams.get("limit") ?? undefined;
    const pageParam = request.nextUrl.searchParams.get("page") ?? undefined;
    const unreadParam = request.nextUrl.searchParams.get("unread") ?? undefined;

    const parsedQuery = adminNotificationsQuerySchema.safeParse({
      limit: limitParam,
      page: pageParam,
      unread: unreadParam,
    });

    if (!parsedQuery.success) {
      return NextResponse.json(
        { error: "Invalid query parameters", issues: parsedQuery.error.format(), requestId },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    const { limit, page, unread: unreadOnly } = parsedQuery.data;

    const data = await svc.listCenter(session.user.id, { limit, page, unreadOnly });

    return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
  } catch (error: any) {
    logError(error, { layer: "api", requestId, route: "/api/admin/notifications" });
    return NextResponse.json(
      { error: "Failed to load notifications", requestId },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}

export async function PATCH(request: NextRequest) {
  const requestId = getRequestIdFromHeaders(request.headers);

  try {
    const session = await requireAdminApi();
    const body = await request.json().catch(() => null);
    const parsed = adminNotificationUpdateSchema.safeParse(body ?? {});

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.format(), requestId },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    const supabase = await createSupabaseServerClient();
    const svc = new AdminNotificationService(supabase);

    const updated = parsed.data.mark_all
      ? await svc.markAllRead(session.user.id)
      : await svc.markRead(session.user.id, parsed.data.ids ?? []);

    return NextResponse.json({ notifications: updated }, { headers: { "Cache-Control": "no-store" } });
  } catch (error: any) {
    logError(error, { layer: "api", requestId, route: "/api/admin/notifications" });
    return NextResponse.json(
      { error: "Failed to update notifications", requestId },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const requestId = getRequestIdFromHeaders(request.headers);

  try {
    const session = await requireAdminApi();
    const body = await request.json().catch(() => null);
    const parsed = deleteSchema.safeParse(body ?? {});

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.format(), requestId },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    const supabase = await createSupabaseServerClient();
    const svc = new AdminNotificationService(supabase);

    const deletedIds =
      "delete_all" in parsed.data
        ? await svc.deleteAll(session.user.id)
        : await svc.deleteMany(session.user.id, parsed.data.ids);

    const deletedCount = deletedIds.length;

    return NextResponse.json(
      deletedCount === 0
        ? { deletedCount: 0, noop: true, message: "No notifications to delete." }
        : { deletedCount, noop: false },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error: any) {
    logError(error, { layer: "api", requestId, route: "/api/admin/notifications" });

    return NextResponse.json(
      { error: "Failed to delete notifications", requestId },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
