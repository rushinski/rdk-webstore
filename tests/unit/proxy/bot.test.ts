import { checkBot } from "@/proxy/bot";
import { makeRequest } from "./helpers";
import { log } from "@/lib/log";
import { security } from "@/config/security";

jest.mock("@/lib/log", () => ({ log: jest.fn() }));

describe("checkBot", () => {
  it("allows known-good bots (case-insensitive)", () => {
    const req = makeRequest({
      url: "https://x.test/api/ping",
      headers: { "user-agent": "Mozilla/5.0 (compatible; GoogleBot/2.1; +http://google.com/bot.html)" },
    });
    expect(checkBot(req, "req_1")).toBeNull();
  });

  it("blocks empty UA", () => {
    const req = makeRequest({ url: "https://x.test/api/ping", headers: {} });
    const res = checkBot(req, "req_1");
    expect(res?.status).toBe(403);
  });

  it("blocks disallowed UA substrings", () => {
    const req = makeRequest({ url: "https://x.test/api/ping", headers: { "user-agent": "curl/8.0" } });
    const res = checkBot(req, "req_1");
    expect(res?.status).toBe(403);
  });

  it("blocks too-short UA", () => {
    const req = makeRequest({ url: "https://x.test/api/ping", headers: { "user-agent": "Mozilla" } });
    const res = checkBot(req, "req_1");
    expect(res?.status).toBe(403);
  });

  it("truncates logged UA (no log injection / bloat)", () => {
    const huge = `curl/8.0 ${"A".repeat(10000)}`;
    const req = makeRequest({ url: "https://x.test/api/ping", headers: { "user-agent": huge } });
    const res = checkBot(req, "req_1");
    expect(res?.status).toBe(403);

    const logMock = log as unknown as jest.Mock;
    const last = logMock.mock.calls.at(-1)?.[0];

    expect(last.userAgent.length).toBeLessThanOrEqual(
      security.proxy.bot.maxLoggedUserAgentLength + 1 // +1 for "…"
    );
  });
});
