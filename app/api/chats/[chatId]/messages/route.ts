// app/api/chats/[chatId]/messages/route.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/service-role";
import { requireUserApi } from "@/lib/auth/session";
import { ChatService } from "@/services/chat-service";
import { chatIdParamsSchema, sendChatMessageSchema } from "@/lib/validation/chat";
import { getRequestIdFromHeaders } from "@/lib/http/request-id";
import { logError } from "@/lib/utils/log";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ chatId: string }> },
) {
  const requestId = getRequestIdFromHeaders(request.headers);
  const { chatId } = await params;

  const parsedParams = chatIdParamsSchema.safeParse({ chatId });
  if (!parsedParams.success) {
    return NextResponse.json(
      { error: "Invalid params", issues: parsedParams.error.format(), requestId },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    await requireUserApi();
    const supabase = await createSupabaseServerClient();
    const chatService = new ChatService(supabase);

    const messages = await chatService.listMessages(parsedParams.data.chatId);

    return NextResponse.json({ messages }, { headers: { "Cache-Control": "no-store" } });
  } catch (error: unknown) {
    logError(error, {
      layer: "api",
      requestId,
      route: "/api/chats/:chatId/messages",
    });

    return NextResponse.json(
      { error: "Failed to load messages", requestId },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ chatId: string }> },
) {
  const requestId = getRequestIdFromHeaders(request.headers);
  const { chatId } = await params;

  const parsedParams = chatIdParamsSchema.safeParse({ chatId });
  if (!parsedParams.success) {
    return NextResponse.json(
      { error: "Invalid params", issues: parsedParams.error.format(), requestId },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const body = await request.json().catch(() => null);
  const parsedBody = sendChatMessageSchema.safeParse(body ?? {});

  if (!parsedBody.success) {
    return NextResponse.json(
      { error: "Invalid payload", issues: parsedBody.error.format(), requestId },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const session = await requireUserApi();
    const supabase = await createSupabaseServerClient();
    const adminSupabase = createSupabaseAdminClient();
    const chatService = new ChatService(supabase, adminSupabase);

    const message = await chatService.sendMessage({
      chatId: parsedParams.data.chatId,
      senderId: session.user.id,
      body: parsedBody.data.message,
    });

    return NextResponse.json({ message }, { headers: { "Cache-Control": "no-store" } });
  } catch (error: unknown) {
    logError(error, {
      layer: "api",
      requestId,
      route: "/api/chats/:chatId/messages",
    });

    const message = error instanceof Error ? error.message : "Failed to send message";
    const status = message.includes("Chat") || message.includes("Forbidden") ? 400 : 500;

    return NextResponse.json(
      { error: message, requestId },
      { status, headers: { "Cache-Control": "no-store" } },
    );
  }
}
