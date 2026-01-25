// src/proxy/bot.ts
import { NextResponse, type NextRequest } from "next/server";

import { log } from "@/lib/utils/log";
import { security } from "@/config/security";

export function checkBot(request: NextRequest, requestId: string): NextResponse | null {
  const { pathname } = request.nextUrl;
  const { bot } = security.proxy;

  const userAgentRaw = request.headers.get("user-agent") ?? "";
  const userAgentTrimmed = userAgentRaw.trim();
  const userAgentLower = userAgentTrimmed.toLowerCase();

  const userAgentForLog =
    userAgentTrimmed.length > bot.maxLoggedUserAgentLength
      ? `${userAgentTrimmed.slice(0, bot.maxLoggedUserAgentLength)}…`
      : userAgentTrimmed;

  const blockBot = (logMessage: string, errorMessage: string): NextResponse => {
    log({
      level: "warn",
      layer: "proxy",
      message: logMessage,
      requestId,
      route: pathname,
      status: bot.blockStatus,
      event: "bot_mitigation",
      userAgent: userAgentForLog,
    });

    return NextResponse.json(
      { error: errorMessage, requestId },
      { status: bot.blockStatus },
    );
  };

  const isAllowedBot = bot.allowedUserAgents.some((allowedToken) =>
    userAgentLower.includes(allowedToken.toLowerCase()),
  );

  if (isAllowedBot) {
    return null;
  }

  if (userAgentTrimmed.length === 0) {
    return blockBot("bot_block_empty_ua", "Bot blocked (empty user-agent)");
  }

  const isDisallowedAgent = bot.disallowedUserAgentSubstrings.some(
    (disallowedSubstring) => userAgentLower.includes(disallowedSubstring),
  );

  if (isDisallowedAgent) {
    return blockBot("bot_block_suspect_agent", "Bot blocked (disallowed user-agent)");
  }

  if (userAgentTrimmed.length < bot.minUserAgentLength) {
    return blockBot("bot_block_short_ua", "Bot blocked (invalid user-agent)");
  }

  return null;
}
