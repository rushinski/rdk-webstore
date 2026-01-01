// app/api/chats/[chatId]/close/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/session";
import { ChatService } from "@/services/chat-service";
import { chatIdParamsSchema } from "@/lib/validation/chat";
import { getRequestIdFromHeaders } from "@/lib/http/request-id";
import { logError } from "@/lib/log";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ chatId: string }> }
) {
  const requestId = getRequestIdFromHeaders(request.headers);
  const { chatId } = await params;

  const parsedParams = chatIdParamsSchema.safeParse({ chatId });
  if (!parsedParams.success) {
    return NextResponse.json(
      { error: "Invalid params", issues: parsedParams.error.format(), requestId },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }

  try {
    const session = await requireUser();
    const supabase = await createSupabaseServerClient();
    const chatService = new ChatService(supabase);

    const chat = await chatService.closeChat(parsedParams.data.chatId, session.user.id);

    return NextResponse.json(
      { chat },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error: any) {
    logError(error, {
      layer: "api",
      requestId,
      route: "/api/chats/:chatId/close",
    });

    return NextResponse.json(
      { error: "Failed to close chat", requestId },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
