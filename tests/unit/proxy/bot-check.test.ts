// tests/unit/proxy/bot-check.test.ts
import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import { NextRequest, NextResponse } from "next/server";
import { checkBot } from "@/proxy/bot";
import { security } from "@/config/security";

describe("Unit: Bot Check", () => {
  const requestId = "test-request-id";
  const baseUrl = "http://localhost:3000";
  const createMockRequest = (userAgent: string | null) =>
    ({
      headers: {
        get: (name: string) => (name.toLowerCase() === "user-agent" ? userAgent : null),
      },
      nextUrl: new URL(`${baseUrl}/admin`),
    } as unknown as NextRequest);


  describe("Allowed Bots", () => {
    it("allows Googlebot", () => {
      const request = new NextRequest(`${baseUrl}/admin`, {
        headers: { "user-agent": "Mozilla/5.0 (compatible; Googlebot/2.1)" },
      });

      const result = checkBot(request, requestId);
      expect(result).toBeNull();
    });

    it("allows Googlebot with mixed case", () => {
      const request = new NextRequest(`${baseUrl}/admin`, {
        headers: { "user-agent": "Mozilla/5.0 (compatible; googlebot/2.1)" },
      });

      const result = checkBot(request, requestId);
      expect(result).toBeNull();
    });

    it("allows Applebot", () => {
      const request = new NextRequest(`${baseUrl}/admin`, {
        headers: { "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15 (Applebot/0.1)" },
      });

      const result = checkBot(request, requestId);
      expect(result).toBeNull();
    });

    it("allows Bingbot", () => {
      const request = new NextRequest(`${baseUrl}/admin`, {
        headers: { "user-agent": "Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)" },
      });

      const result = checkBot(request, requestId);
      expect(result).toBeNull();
    });

    it("allows allowed bot with extra whitespace in UA", () => {
      const request = new NextRequest(`${baseUrl}/admin`, {
        headers: { "user-agent": "  Mozilla/5.0 (compatible; Googlebot/2.1)  " },
      });

      const result = checkBot(request, requestId);
      expect(result).toBeNull();
    });

    it("allows allowed bot in middle of UA string", () => {
      const request = new NextRequest(`${baseUrl}/admin`, {
        headers: { "user-agent": "Custom/1.0 Googlebot/2.1 Other/1.0" },
      });

      const result = checkBot(request, requestId);
      expect(result).toBeNull();
    });
  });

  describe("Empty User-Agent", () => {
    it("blocks request with empty user-agent", () => {
      const request = new NextRequest(`${baseUrl}/admin`, {
        headers: { "user-agent": "" },
      });

      const result = checkBot(request, requestId);
      expect(result).not.toBeNull();
      expect(result?.status).toBe(security.proxy.bot.blockStatus);
    });

    it("blocks request with whitespace-only user-agent", () => {
      const request = new NextRequest(`${baseUrl}/admin`, {
        headers: { "user-agent": "   " },
      });

      const result = checkBot(request, requestId);
      expect(result).not.toBeNull();
      expect(result?.status).toBe(security.proxy.bot.blockStatus);
    });

    it("blocks request with no user-agent header", () => {
      const request = new NextRequest(`${baseUrl}/admin`);

      const result = checkBot(request, requestId);
      expect(result).not.toBeNull();
    });

    it("returns correct error message for empty UA", async () => {
      const request = new NextRequest(`${baseUrl}/admin`, {
        headers: { "user-agent": "" },
      });

      const result = checkBot(request, requestId);
      const json = await result?.json();
      expect(json.error).toMatch(/empty user-agent/i);
    });
  });

  describe("Disallowed User-Agents", () => {
    it("blocks curl", () => {
      const request = new NextRequest(`${baseUrl}/admin`, {
        headers: { "user-agent": "curl/7.68.0" },
      });

      const result = checkBot(request, requestId);
      expect(result).not.toBeNull();
    });

    it("blocks curl with mixed case", () => {
      const request = new NextRequest(`${baseUrl}/admin`, {
        headers: { "user-agent": "cUrl/7.68.0" },
      });

      const result = checkBot(request, requestId);
      expect(result).not.toBeNull();
    });

    it("blocks wget", () => {
      const request = new NextRequest(`${baseUrl}/admin`, {
        headers: { "user-agent": "Wget/1.20.3 (linux-gnu)" },
      });

      const result = checkBot(request, requestId);
      expect(result).not.toBeNull();
    });

    it("blocks python-requests", () => {
      const request = new NextRequest(`${baseUrl}/admin`, {
        headers: { "user-agent": "python-requests/2.28.1" },
      });

      const result = checkBot(request, requestId);
      expect(result).not.toBeNull();
    });

    it("blocks go-http-client", () => {
      const request = new NextRequest(`${baseUrl}/admin`, {
        headers: { "user-agent": "Go-http-client/1.1" },
      });

      const result = checkBot(request, requestId);
      expect(result).not.toBeNull();
    });

    it("blocks libwww-perl", () => {
      const request = new NextRequest(`${baseUrl}/admin`, {
        headers: { "user-agent": "libwww-perl/6.49" },
      });

      const result = checkBot(request, requestId);
      expect(result).not.toBeNull();
    });

    it("blocks scrapy", () => {
      const request = new NextRequest(`${baseUrl}/admin`, {
        headers: { "user-agent": "Scrapy/2.7.1 (+https://scrapy.org)" },
      });

      const result = checkBot(request, requestId);
      expect(result).not.toBeNull();
    });

    it("blocks disallowed agent in middle of UA string", () => {
      const request = new NextRequest(`${baseUrl}/admin`, {
        headers: { "user-agent": "Custom/1.0 python-requests/2.28.1 Other/1.0" },
      });

      const result = checkBot(request, requestId);
      expect(result).not.toBeNull();
    });

    it("returns correct error message for disallowed agent", async () => {
      const request = new NextRequest(`${baseUrl}/admin`, {
        headers: { "user-agent": "curl/7.68.0" },
      });

      const result = checkBot(request, requestId);
      const json = await result?.json();
      expect(json.error).toMatch(/disallowed user-agent/i);
    });
  });

  describe("Short User-Agent", () => {
    it("blocks user-agent shorter than minimum", () => {
      const shortUA = "a".repeat(security.proxy.bot.minUserAgentLength - 1);
      const request = new NextRequest(`${baseUrl}/admin`, {
        headers: { "user-agent": shortUA },
      });

      const result = checkBot(request, requestId);
      expect(result).not.toBeNull();
    });

    it("allows user-agent at minimum length", () => {
      const minUA = "a".repeat(security.proxy.bot.minUserAgentLength);
      const request = new NextRequest(`${baseUrl}/admin`, {
        headers: { "user-agent": minUA },
      });

      const result = checkBot(request, requestId);
      expect(result).toBeNull();
    });

    it("allows user-agent longer than minimum", () => {
      const longUA = "a".repeat(security.proxy.bot.minUserAgentLength + 1);
      const request = new NextRequest(`${baseUrl}/admin`, {
        headers: { "user-agent": longUA },
      });

      const result = checkBot(request, requestId);
      expect(result).toBeNull();
    });

    it("returns correct error message for short UA", async () => {
      const request = new NextRequest(`${baseUrl}/admin`, {
        headers: { "user-agent": "abc" },
      });

      const result = checkBot(request, requestId);
      const json = await result?.json();
      expect(json.error).toMatch(/invalid user-agent/i);
    });
  });

  describe("Valid User-Agents", () => {
    it("allows Chrome", () => {
      const request = new NextRequest(`${baseUrl}/admin`, {
        headers: { "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" },
      });

      const result = checkBot(request, requestId);
      expect(result).toBeNull();
    });

    it("allows Firefox", () => {
      const request = new NextRequest(`${baseUrl}/admin`, {
        headers: { "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0" },
      });

      const result = checkBot(request, requestId);
      expect(result).toBeNull();
    });

    it("allows Safari", () => {
      const request = new NextRequest(`${baseUrl}/admin`, {
        headers: { "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15" },
      });

      const result = checkBot(request, requestId);
      expect(result).toBeNull();
    });

    it("allows Edge", () => {
      const request = new NextRequest(`${baseUrl}/admin`, {
        headers: { "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0" },
      });

      const result = checkBot(request, requestId);
      expect(result).toBeNull();
    });

    it("allows Mobile Safari", () => {
      const request = new NextRequest(`${baseUrl}/admin`, {
        headers: { "user-agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1" },
      });

      const result = checkBot(request, requestId);
      expect(result).toBeNull();
    });

    it("allows Mobile Chrome", () => {
      const request = new NextRequest(`${baseUrl}/admin`, {
        headers: { "user-agent": "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36" },
      });

      const result = checkBot(request, requestId);
      expect(result).toBeNull();
    });
  });

  describe("Response Structure", () => {
    it("includes request ID in response", async () => {
      const request = new NextRequest(`${baseUrl}/admin`, {
        headers: { "user-agent": "" },
      });

      const result = checkBot(request, requestId);
      const json = await result?.json();
      expect(json.requestId).toBe(requestId);
    });

    it("includes error message in response", async () => {
      const request = new NextRequest(`${baseUrl}/admin`, {
        headers: { "user-agent": "" },
      });

      const result = checkBot(request, requestId);
      const json = await result?.json();
      expect(json.error).toBeTruthy();
    });

    it("returns correct HTTP status", () => {
      const request = new NextRequest(`${baseUrl}/admin`, {
        headers: { "user-agent": "" },
      });

      const result = checkBot(request, requestId);
      expect(result?.status).toBe(security.proxy.bot.blockStatus);
    });

    it("returns JSON response", () => {
      const request = new NextRequest(`${baseUrl}/admin`, {
        headers: { "user-agent": "" },
      });

      const result = checkBot(request, requestId);
      expect(result?.headers.get("content-type")).toContain("application/json");
    });
  });

  describe("Edge Cases", () => {
    it("handles very long user-agent", () => {
      const longUA = "Mozilla/5.0 " + "a".repeat(10000);
      const request = new NextRequest(`${baseUrl}/admin`, {
        headers: { "user-agent": longUA },
      });

      const result = checkBot(request, requestId);
      expect(result).toBeNull(); // Should not crash
    });

    it("handles user-agent with special characters", () => {
      const request = new NextRequest(`${baseUrl}/admin`, {
        headers: { "user-agent": "Mozilla/5.0 (Windows) <script>alert('xss')</script>" },
      });

      const result = checkBot(request, requestId);
      expect(result).toBeNull(); // Not a blocked bot
    });

    it("handles user-agent with unicode", () => {
      const request = createMockRequest("Mozilla/5.0 (Windows) 你好世界");

      const result = checkBot(request, requestId);
      expect(result).toBeNull();
    });

    it("handles user-agent with newlines", () => {
      const request = createMockRequest("Mozilla/5.0\nWindows\nChrome");

      const result = checkBot(request, requestId);
      expect(result).toBeNull();
    });

    it("handles user-agent with tabs", () => {
      const request = createMockRequest("Mozilla/5.0\tWindows\tChrome");

      const result = checkBot(request, requestId);
      expect(result).toBeNull();
    });

    it("handles multiple spaces in user-agent", () => {
      const request = new NextRequest(`${baseUrl}/admin`, {
        headers: { "user-agent": "Mozilla/5.0     Windows     Chrome" },
      });

      const result = checkBot(request, requestId);
      expect(result).toBeNull();
    });

    it("handles user-agent that is exactly minimum length after trim", () => {
      const ua = " ".repeat(10) + "a".repeat(security.proxy.bot.minUserAgentLength) + " ".repeat(10);
      const request = new NextRequest(`${baseUrl}/admin`, {
        headers: { "user-agent": ua },
      });

      const result = checkBot(request, requestId);
      expect(result).toBeNull();
    });
  });

  describe("Priority Order", () => {
    it("allows bot even if UA is short (allowlist takes precedence)", () => {
      const request = new NextRequest(`${baseUrl}/admin`, {
        headers: { "user-agent": "Googlebot" },
      });

      const result = checkBot(request, requestId);
      expect(result).toBeNull();
    });

    it("blocks disallowed bot even if UA is long enough", () => {
      const longCurl = "curl/7.68.0 " + "a".repeat(1000);
      const request = new NextRequest(`${baseUrl}/admin`, {
        headers: { "user-agent": longCurl },
      });

      const result = checkBot(request, requestId);
      expect(result).not.toBeNull();
    });

    it("checks allowlist before disallowlist", () => {
      // If Googlebot contains curl substring
      const request = new NextRequest(`${baseUrl}/admin`, {
        headers: { "user-agent": "Googlebot-with-curl-string" },
      });

      const result = checkBot(request, requestId);
      expect(result).toBeNull(); // Allowlist wins
    });
  });

  describe("Case Sensitivity", () => {
    it("handles uppercase in allowed bot", () => {
      const request = new NextRequest(`${baseUrl}/admin`, {
        headers: { "user-agent": "GOOGLEBOT/2.1" },
      });

      const result = checkBot(request, requestId);
      expect(result).toBeNull();
    });

    it("handles mixed case in disallowed agent", () => {
      const request = new NextRequest(`${baseUrl}/admin`, {
        headers: { "user-agent": "PyThOn-ReQuEsTs/2.28.1" },
      });

      const result = checkBot(request, requestId);
      expect(result).not.toBeNull();
    });

    it("handles lowercase valid browser", () => {
      const request = new NextRequest(`${baseUrl}/admin`, {
        headers: { "user-agent": "mozilla/5.0 chrome/120.0.0.0" },
      });

      const result = checkBot(request, requestId);
      expect(result).toBeNull();
    });
  });
});
