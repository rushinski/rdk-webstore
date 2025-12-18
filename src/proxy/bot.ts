// src/proxy/bot.ts
import { NextResponse, type NextRequest } from "next/server";

import { log } from "@/lib/log";
import { security } from "@/config/security";

export function checkBot(
  request: NextRequest,
  requestId: string
): NextResponse | null {
  const { pathname } = request.nextUrl;

  // UA can be missing; normalize once for all rules.
  const uaRaw = request.headers.get("user-agent") ?? "";
  const uaTrimmed = uaRaw.trim();
  const uaLower = uaTrimmed.toLowerCase();

  const { bot } = security.proxy;

  // Keep logged UA bounded to avoid log bloat.
  const userAgentForLog =
    uaTrimmed.length > bot.maxLoggedUserAgentLength
      ? `${uaTrimmed.slice(0, bot.maxLoggedUserAgentLength)}…`
      : uaTrimmed;

  function block(message: string, error: string) {
    log({
      level: "warn",
      layer: "proxy",
      message,
      requestId,
      route: pathname,
      status: bot.blockStatus,
      event: "bot_mitigation",
      userAgent: userAgentForLog,
    });

    return NextResponse.json({ error, requestId }, { status: bot.blockStatus });
  }

  // Allow known good bots (case-insensitive match)
  const isAllowedBot = bot.allowedUserAgents.some((token) =>
    uaLower.includes(token.toLowerCase())
  );
  if (isAllowedBot) return null;

  // Rule 1 — Empty UA
  if (uaTrimmed.length === 0) {
    return block("bot_block_empty_ua", "Bot blocked (empty user-agent)");
  }

  // Rule 2 — Known scraper agents (substring match)
  const isDisallowedAgent = bot.disallowedUserAgentSubstrings.some((needle) =>
    uaLower.includes(needle)
  );
  if (isDisallowedAgent) {
    return block(
      "bot_block_suspect_agent",
      "Bot blocked (disallowed user-agent)"
    );
  }

  // Rule 3 — Impossible short UA strings
  if (uaTrimmed.length < bot.minUserAgentLength) {
    return block("bot_block_short_ua", "Bot blocked (invalid user-agent)");
  }

  return null;
}
