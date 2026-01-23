import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireUserApi } from "@/lib/auth/session";
import { ProfileRepository } from "@/repositories/profile-repo";
import { getRequestIdFromHeaders } from "@/lib/http/request-id";
import { logError } from "@/lib/log";

const chatNotificationSchema = z
  .object({
    chat_notifications_enabled: z.boolean(),
  })
  .strict();

export async function GET(request: NextRequest) {
  const requestId = getRequestIdFromHeaders(request.headers);

  try {
    const session = await requireUserApi();
    const supabase = await createSupabaseServerClient();
    const profileRepo = new ProfileRepository(supabase);

    const profile = await profileRepo.getByUserId(session.user.id);

    return NextResponse.json(
      { chat_notifications_enabled: profile?.chat_notifications_enabled ?? true },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error: any) {
    logError(error, {
      layer: "api",
      requestId,
      route: "/api/account/notifications",
    });

    return NextResponse.json(
      { error: "Failed to load notifications", requestId },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}

export async function PATCH(request: NextRequest) {
  const requestId = getRequestIdFromHeaders(request.headers);

  try {
    const session = await requireUserApi();
    const body = await request.json().catch(() => null);
    const parsed = chatNotificationSchema.safeParse(body ?? {});

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.format(), requestId },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }

    const supabase = await createSupabaseServerClient();
    const profileRepo = new ProfileRepository(supabase);

    await profileRepo.updateNotificationPreferences(session.user.id, parsed.data);

    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error: any) {
    logError(error, {
      layer: "api",
      requestId,
      route: "/api/account/notifications",
    });

    return NextResponse.json(
      { error: "Failed to update notifications", requestId },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
