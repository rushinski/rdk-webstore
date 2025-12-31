import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { ChatService } from "@/services/chat-service";
import { chatIdParamsSchema, guestChatSchema, guestChatMessageSchema } from "@/lib/validation/chat";
import { getRequestIdFromHeaders } from "@/lib/http/request-id";
import { logError } from "@/lib/log";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ chatId: string }> }
) {
  const requestId = getRequestIdFromHeaders(request.headers);
  const { chatId } = await params;

  const parsedParams = chatIdParamsSchema.safeParse({ chatId });
  const parsedQuery = guestChatSchema.safeParse({
    orderId: request.nextUrl.searchParams.get("orderId"),
    token: request.nextUrl.searchParams.get("token"),
  });

  if (!parsedParams.success || !parsedQuery.success) {
    return NextResponse.json(
      {
        error: "Invalid request",
        issues: {
          params: parsedParams.error?.format(),
          query: parsedQuery.error?.format(),
        },
        requestId,
      },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }

  try {
    const adminSupabase = createSupabaseAdminClient();
    const chatService = new ChatService(adminSupabase, adminSupabase);
    const messages = await chatService.listMessagesForGuest({
      chatId: parsedParams.data.chatId,
      orderId: parsedQuery.data.orderId,
      publicToken: parsedQuery.data.token,
    });

    return NextResponse.json(
      { messages },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error: any) {
    logError(error, {
      layer: "api",
      requestId,
      route: "/api/chats/guest/:chatId/messages",
    });

    const message = error?.message ?? "Failed to load messages";
    const status = message.includes("Order") || message.includes("Chat") ? 400 : 500;

    return NextResponse.json(
      { error: message, requestId },
      { status, headers: { "Cache-Control": "no-store" } }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ chatId: string }> }
) {
  const requestId = getRequestIdFromHeaders(request.headers);
  const { chatId } = await params;

  const parsedParams = chatIdParamsSchema.safeParse({ chatId });
  const body = await request.json().catch(() => null);
  const parsedBody = guestChatMessageSchema.safeParse(body ?? {});

  if (!parsedParams.success || !parsedBody.success) {
    return NextResponse.json(
      {
        error: "Invalid request",
        issues: {
          params: parsedParams.error?.format(),
          body: parsedBody.error?.format(),
        },
        requestId,
      },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }

  try {
    const adminSupabase = createSupabaseAdminClient();
    const chatService = new ChatService(adminSupabase, adminSupabase);
    const message = await chatService.sendGuestMessage({
      chatId: parsedParams.data.chatId,
      orderId: parsedBody.data.orderId,
      publicToken: parsedBody.data.token,
      body: parsedBody.data.message,
    });

    return NextResponse.json(
      { message },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error: any) {
    logError(error, {
      layer: "api",
      requestId,
      route: "/api/chats/guest/:chatId/messages",
    });

    const message = error?.message ?? "Failed to send message";
    const status = message.includes("Order") || message.includes("Chat") ? 400 : 500;

    return NextResponse.json(
      { error: message, requestId },
      { status, headers: { "Cache-Control": "no-store" } }
    );
  }
}
