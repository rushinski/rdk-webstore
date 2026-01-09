// app/api/cart/snapshot/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cartSnapshotSchema } from "@/lib/validation/cart";
import { serializeCartSnapshot } from "@/lib/cart/snapshot";
import { getRequestIdFromHeaders } from "@/lib/http/request-id";

const COOKIE_NAME = "rdk_cart_snapshot";
const COOKIE_MAX_AGE = 60 * 60 * 24;

export async function POST(request: NextRequest) {
  const requestId = getRequestIdFromHeaders(request.headers);

  const body = await request.json().catch(() => null);
  const parsed = cartSnapshotSchema.safeParse(body ?? {});
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", issues: parsed.error.format(), requestId },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }

  const snapshot = serializeCartSnapshot(parsed.data.items);
  const response = NextResponse.json(
    { ok: true, requestId },
    { headers: { "Cache-Control": "no-store" } }
  );

  response.cookies.set({
    name: COOKIE_NAME,
    value: snapshot,
    httpOnly: true,
    maxAge: COOKIE_MAX_AGE,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });

  return response;
}
