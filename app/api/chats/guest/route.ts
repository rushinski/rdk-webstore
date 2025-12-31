import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { ChatService } from "@/services/chat-service";
import { guestChatSchema } from "@/lib/validation/chat";
import { getRequestIdFromHeaders } from "@/lib/http/request-id";
import { logError } from "@/lib/log";

export async function GET(request: NextRequest) {
  const requestId = getRequestIdFromHeaders(request.headers);

  const parsed = guestChatSchema.safeParse({
    orderId: request.nextUrl.searchParams.get("orderId"),
    token: request.nextUrl.searchParams.get("token"),
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid query", issues: parsed.error.format(), requestId },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }

  try {
    const adminSupabase = createSupabaseAdminClient();
    const chatService = new ChatService(adminSupabase, adminSupabase);
    const chat = await chatService.getChatForGuest({
      orderId: parsed.data.orderId,
      publicToken: parsed.data.token,
    });

    return NextResponse.json(
      { chat },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error: any) {
    logError(error, {
      layer: "api",
      requestId,
      route: "/api/chats/guest",
    });

    const message = error?.message ?? "Failed to load chat";
    const status = message.includes("Order") ? 404 : 500;

    return NextResponse.json(
      { error: message, requestId },
      { status, headers: { "Cache-Control": "no-store" } }
    );
  }
}

export async function POST(request: NextRequest) {
  const requestId = getRequestIdFromHeaders(request.headers);

  const body = await request.json().catch(() => null);
  const parsed = guestChatSchema.safeParse(body ?? {});

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", issues: parsed.error.format(), requestId },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }

  try {
    const adminSupabase = createSupabaseAdminClient();
    const chatService = new ChatService(adminSupabase, adminSupabase);
    const result = await chatService.createChatForGuest({
      orderId: parsed.data.orderId,
      publicToken: parsed.data.token,
    });

    return NextResponse.json(
      { chat: result.chat, created: result.created },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error: any) {
    logError(error, {
      layer: "api",
      requestId,
      route: "/api/chats/guest",
    });

    const message = error?.message ?? "Failed to create chat";
    const status = message.includes("Order") ? 400 : 500;

    return NextResponse.json(
      { error: message, requestId },
      { status, headers: { "Cache-Control": "no-store" } }
    );
  }
}
