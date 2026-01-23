import { NextResponse } from "next/server";

import { getServerSession } from "@/lib/auth/session";
import { getRequestIdFromHeaders } from "@/lib/http/request-id";
import { logError } from "@/lib/log";

export async function GET(request: Request) {
  const requestId = getRequestIdFromHeaders(request.headers);

  try {
    const session = await getServerSession();

    if (!session) {
      return NextResponse.json(
        { user: null, role: null },
        { headers: { "Cache-Control": "no-store" } },
      );
    }

    return NextResponse.json(
      {
        user: {
          id: session.user.id,
          email: session.user.email,
        },
        role: session.role,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    logError(error, {
      layer: "auth",
      requestId,
      route: "/api/auth/session",
    });

    return NextResponse.json(
      { error: "Failed to fetch session", requestId },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
