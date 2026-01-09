// app/api/cart/restore/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { cartSnapshotSchema } from "@/lib/validation/cart";
import { parseCartSnapshot } from "@/lib/cart/snapshot";
import { getRequestIdFromHeaders } from "@/lib/http/request-id";

const COOKIE_NAME = "rdk_cart_snapshot";

export async function GET(request: Request) {
  const requestId = getRequestIdFromHeaders(new Headers(request.headers));
  const cookieStore = await cookies();
  const snapshotCookie = cookieStore.get(COOKIE_NAME);

  if (!snapshotCookie?.value) {
    return NextResponse.json(
      { items: [], restored: false, requestId },
      { headers: { "Cache-Control": "no-store" } }
    );
  }

  const items = parseCartSnapshot(snapshotCookie.value);
  if (!items) {
    const response = NextResponse.json(
      { items: [], restored: false, requestId },
      { headers: { "Cache-Control": "no-store" } }
    );
    response.cookies.set({
      name: COOKIE_NAME,
      value: "",
      maxAge: 0,
      path: "/",
    });
    return response;
  }

  const parsed = cartSnapshotSchema.safeParse({ items });
  if (!parsed.success) {
    const response = NextResponse.json(
      { items: [], restored: false, requestId },
      { headers: { "Cache-Control": "no-store" } }
    );
    response.cookies.set({
      name: COOKIE_NAME,
      value: "",
      maxAge: 0,
      path: "/",
    });
    return response;
  }

  const response = NextResponse.json(
    { items: parsed.data.items, restored: true, requestId },
    { headers: { "Cache-Control": "no-store" } }
  );

  response.cookies.set({
    name: COOKIE_NAME,
    value: "",
    maxAge: 0,
    path: "/",
  });

  return response;
}
