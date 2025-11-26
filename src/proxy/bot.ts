import { NextResponse, type NextRequest } from "next/server";

import { log } from "@/lib/log";

export function checkBot(request: NextRequest, requestId: string) {
  // ua (User-Agent)
  const ua = request.headers.get("user-agent") || "";
  const { pathname } = request.nextUrl;

  // Allow known good bots (SEO crawlers)
  const allowed = ["Googlebot", "Applebot", "Bingbot"];
  if (allowed.some((bot) => ua.includes(bot))) {
    return null;
  }

  // Rule 1 — Empty UA
  if (ua.trim().length === 0) {
    log({
      level: "warn",
      layer: "proxy",
      message: "bot_block_empty_ua",
      requestId: requestId,
      route: pathname,
      status: 403, // Forbidden
      event: "bot_mitigation",
      userAgent: ua,
    });

    const res = NextResponse.json(
      { error: "Bot blocked (empty UA)", requestId },
      { status: 403 },
    );
    return res;
  }

  // Rule 2 — Known scraper agents
  const badAgents = [
    "curl/",
    "Wget/",
    "python-requests",
    "Go-http-client",
    "libwww-perl",
    "scrapy",
  ];

  if (badAgents.some((a) => ua.toLowerCase().includes(a.toLowerCase()))) {
    log({
      level: "warn",
      layer: "proxy",
      message: "bot_block_suspect_agent",
      requestId: requestId,
      route: pathname,
      status: 403, // Forbidden
      event: "bot_mitigation",
      userAgent: ua,
    });

    const res = NextResponse.json(
      { error: "Bot blocked (disallowed user-agent)", requestId },
      { status: 403 },
    );
    return res;
  }

  // Rule 3 — Impossible short UA strings
  if (ua.length < 8) {
    log({
      level: "warn",
      layer: "proxy",
      message: "bot_block_short_ua",
      requestId: requestId,
      route: pathname,
      status: 403, // Forbidden
      event: "bot_mitigation",
      userAgent: ua,
    });

    const res = NextResponse.json(
      { error: "Bot blocked (invalid UA)", requestId },
      { status: 403 },
    );
    return res;
  }

  return null;
}
