// app/api/chats/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireAdmin, requireUser } from "@/lib/auth/session";
import { ChatService } from "@/services/chat-service";
import { createChatSchema, listChatsQuerySchema } from "@/lib/validation/chat";
import { getRequestIdFromHeaders } from "@/lib/http/request-id";
import { logError } from "@/lib/log";

export async function GET(request: NextRequest) {
  const requestId = getRequestIdFromHeaders(request.headers);

  try {
    await requireAdmin();
    const supabase = await createSupabaseServerClient();
    const chatService = new ChatService(supabase);

    const parsed = listChatsQuerySchema.safeParse({
      status: request.nextUrl.searchParams.get("status") ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid query", issues: parsed.error.format(), requestId },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    const chats = await chatService.listAdminChats(parsed.data);

    return NextResponse.json(
      { chats },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error: any) {
    logError(error, {
      layer: "api",
      requestId,
      route: "/api/chats",
    });

    return NextResponse.json(
      { error: "Failed to load chats", requestId },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}

export async function POST(request: NextRequest) {
  const requestId = getRequestIdFromHeaders(request.headers);

  try {
    const session = await requireUser();
    const body = await request.json().catch(() => null);
    const parsed = createChatSchema.safeParse(body ?? {});

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.format(), requestId },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    const supabase = await createSupabaseServerClient();
    const adminSupabase = createSupabaseAdminClient();
    const chatService = new ChatService(supabase, adminSupabase);

    const result = await chatService.createChatForUser({
      userId: session.user.id,
      orderId: parsed.data.orderId,
    });

    return NextResponse.json(
      { chat: result.chat, created: result.created },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error: any) {
    logError(error, {
      layer: "api",
      requestId,
      route: "/api/chats",
    });

    const message = error?.message ?? "Failed to create chat";
    const status = message.includes("Order") ? 400 : 500;

    return NextResponse.json(
      { error: message, requestId },
      { status, headers: { "Cache-Control": "no-store" } }
    );
  }
}
