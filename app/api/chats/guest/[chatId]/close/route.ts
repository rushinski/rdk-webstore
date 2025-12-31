import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { ChatService } from "@/services/chat-service";
import { chatIdParamsSchema, guestChatSchema } from "@/lib/validation/chat";
import { getRequestIdFromHeaders } from "@/lib/http/request-id";
import { logError } from "@/lib/log";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ chatId: string }> }
) {
  const requestId = getRequestIdFromHeaders(request.headers);
  const { chatId } = await params;

  const parsedParams = chatIdParamsSchema.safeParse({ chatId });
  const body = await request.json().catch(() => null);
  const parsedBody = guestChatSchema.safeParse(body ?? {});

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
    const chat = await chatService.closeChatForGuest({
      chatId: parsedParams.data.chatId,
      orderId: parsedBody.data.orderId,
      publicToken: parsedBody.data.token,
    });

    return NextResponse.json(
      { chat },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error: any) {
    logError(error, {
      layer: "api",
      requestId,
      route: "/api/chats/guest/:chatId/close",
    });

    const message = error?.message ?? "Failed to close chat";
    const status = message.includes("Order") || message.includes("Chat") ? 400 : 500;

    return NextResponse.json(
      { error: message, requestId },
      { status, headers: { "Cache-Control": "no-store" } }
    );
  }
}
