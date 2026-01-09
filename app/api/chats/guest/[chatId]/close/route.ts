// app/api/chats/guest/[chatId]/close/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getRequestIdFromHeaders } from "@/lib/http/request-id";

const respondDisabled = (request: NextRequest) => {
  const requestId = getRequestIdFromHeaders(request.headers);
  return NextResponse.json(
    { error: "Guest chat disabled", requestId },
    { status: 403, headers: { "Cache-Control": "no-store" } }
  );
};

export async function POST(request: NextRequest) {
  return respondDisabled(request);
}
