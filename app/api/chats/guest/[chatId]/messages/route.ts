// app/api/chats/guest/[chatId]/messages/route.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getRequestIdFromHeaders } from "@/lib/http/request-id";

const respondDisabled = (request: NextRequest) => {
  const requestId = getRequestIdFromHeaders(request.headers);
  return NextResponse.json(
    { error: "Guest chat disabled", requestId },
    { status: 403, headers: { "Cache-Control": "no-store" } },
  );
};

export function GET(request: NextRequest) {
  return respondDisabled(request);
}

export function POST(request: NextRequest) {
  return respondDisabled(request);
}
