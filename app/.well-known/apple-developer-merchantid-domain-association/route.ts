// app/.well-known/apple-developer-merchantid-domain-association/route.ts
//
// Serves the Apple Pay domain verification file required by Apple.
// Stripe hosts the canonical file — this route proxies it so the domain
// passes Apple's verification check.

import { NextResponse } from "next/server";

const STRIPE_VERIFICATION_URL =
  "https://stripe.com/files/apple-pay/apple-developer-merchantid-domain-association";

let cachedBody: string | null = null;
let cachedAt = 0;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export async function GET() {
  try {
    const now = Date.now();
    if (cachedBody && now - cachedAt < CACHE_TTL_MS) {
      return new NextResponse(cachedBody, {
        status: 200,
        headers: { "Content-Type": "text/plain" },
      });
    }

    const res = await fetch(STRIPE_VERIFICATION_URL);

    if (!res.ok) {
      throw new Error(`Stripe returned ${res.status}`);
    }

    const body = await res.text();
    cachedBody = body;
    cachedAt = now;

    return new NextResponse(body, {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  } catch {
    return new NextResponse("", { status: 502 });
  }
}
