// app/api/chats/current/route.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireUserApi } from "@/lib/auth/session";
import { ChatService } from "@/services/chat-service";
import { getRequestIdFromHeaders } from "@/lib/http/request-id";
import { logError } from "@/lib/log";

export async function GET(request: NextRequest) {
  const requestId = getRequestIdFromHeaders(request.headers);

  try {
    const session = await requireUserApi();
    const supabase = await createSupabaseServerClient();
    const chatService = new ChatService(supabase);

    const chat = await chatService.getOpenChatForUser(session.user.id);

    return NextResponse.json({ chat }, { headers: { "Cache-Control": "no-store" } });
  } catch (error: any) {
    logError(error, {
      layer: "api",
      requestId,
      route: "/api/chats/current",
    });

    return NextResponse.json(
      { error: "Failed to load chat", requestId },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
