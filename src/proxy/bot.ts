// src/proxy/bot.ts
import { NextResponse, type NextRequest } from "next/server";

import { log } from "@/lib/log";
import { security } from "@/config/security";

/**
 * Bot detection and mitigation middleware.
 * 
 * **Purpose:**
 * Protects high-value routes (admin, API, auth, products) from automated
 * scraping, credential stuffing, and DDoS attacks by filtering suspicious
 * user agents.
 * 
 * **Strategy:**
 * This is a lightweight, UA-based filter - NOT a replacement for rate limiting.
 * It catches the lowest-hanging fruit (obvious bots with missing/fake UAs).
 * 
 * **Detection Rules:**
 * 1. Allow known-good bots (search engines, platform crawlers)
 * 2. Block empty or "null" user agents
 * 3. Block known scraper/bot agent strings (curl, wget, scrapy, etc.)
 * 4. Block impossibly short UA strings (likely spoofed)
 * 
 * **Why user-agent based?**
 * - Fast: No external API calls or complex fingerprinting
 * - Edge-compatible: Runs on Vercel/Cloudflare edge
 * - Catches 80% of naive bots with 0% latency overhead
 * - Legitimate clients always send realistic UA strings
 * 
 * **Limitations:**
 * - Sophisticated bots can spoof user agents
 * - That's why we ALSO use rate limiting (separate layer)
 * - This is defense-in-depth, not a silver bullet
 * 
 * @param request - The incoming Next.js request
 * @param requestId - Correlation ID for logging/tracing
 * 
 * @returns NextResponse when bot is blocked (403 JSON error)
 * @returns null when traffic appears legitimate (allows request to proceed)
 */
export function checkBot(
  request: NextRequest,
  requestId: string
): NextResponse | null {
  const { pathname } = request.nextUrl;
  const { bot } = security.proxy;

  // Extract and normalize user-agent
  // UA can be missing, so we defensively default to empty string
  const userAgentRaw = request.headers.get("user-agent") ?? "";
  const userAgentTrimmed = userAgentRaw.trim();
  const userAgentLower = userAgentTrimmed.toLowerCase();

  // Truncate UA for logging to prevent log injection/bloat attacks
  // (Malicious clients might send megabyte-sized UA strings)
  const userAgentForLog =
    userAgentTrimmed.length > bot.maxLoggedUserAgentLength
      ? `${userAgentTrimmed.slice(0, bot.maxLoggedUserAgentLength)}…`
      : userAgentTrimmed;

  /**
   * Centralized blocking function for consistency.
   * Ensures all bot blocks are logged uniformly and return identical responses.
   */
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
      { status: bot.blockStatus }
    );
  };

  // ==========================================================================
  // RULE 0: Allow known-good bots (search engines, monitoring services)
  // ==========================================================================
  
  // These bots are beneficial (SEO, uptime monitoring, etc.)
  // We use case-insensitive substring matching
  const isAllowedBot = bot.allowedUserAgents.some((allowedToken) =>
    userAgentLower.includes(allowedToken.toLowerCase())
  );

  if (isAllowedBot) {
    // Early return - no need to check other rules
    return null;
  }

  // ==========================================================================
  // RULE 1: Block empty user agents
  // ==========================================================================
  
  // Legitimate browsers ALWAYS send a UA string
  // Empty UA is a strong signal of automated tools or manual curl
  if (userAgentTrimmed.length === 0) {
    return blockBot("bot_block_empty_ua", "Bot blocked (empty user-agent)");
  }

  // ==========================================================================
  // RULE 2: Block known scraper/bot agent strings
  // ==========================================================================
  
  // Common automated tools that shouldn't access our application routes
  // This list covers: CLI tools, scrapers, framework default agents
  const isDisallowedAgent = bot.disallowedUserAgentSubstrings.some(
    (disallowedSubstring) => userAgentLower.includes(disallowedSubstring)
  );

  if (isDisallowedAgent) {
    return blockBot(
      "bot_block_suspect_agent",
      "Bot blocked (disallowed user-agent)"
    );
  }

  // ==========================================================================
  // RULE 3: Block impossibly short user agents
  // ==========================================================================
  
  // Real browser user agents are typically 50-200 characters
  // Anything under 8 characters is almost certainly fake/spoofed
  // Example of too-short: "Mozilla" (7 chars) - real UA would be "Mozilla/5.0 ..."
  if (userAgentTrimmed.length < bot.minUserAgentLength) {
    return blockBot("bot_block_short_ua", "Bot blocked (invalid user-agent)");
  }

  // ==========================================================================
  // SUCCESS: Traffic appears legitimate
  // ==========================================================================
  
  return null;
}