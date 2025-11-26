jest.mock("@/lib/log", () => require("../mock/mockLogger"));
jest.mock("@/proxy/session", () => require("../mock/mockSession"));
jest.mock("@upstash/ratelimit", () => require("../mock/mockRateLimit"));
jest.mock("@upstash/redis", () => require("../mock/mockRateLimit"));

global.crypto = {
  randomUUID: () => "test-uuid",
} as any;

import { checkBot } from "@/proxy/bot";

import { createNextRequest } from "../mock/mockNext";

describe("bot check", () => {
  it("allows Googlebot", () => {
    const req = createNextRequest("/auth/login", {
      headers: { "user-agent": "Googlebot" },
    });
    expect(checkBot(req, "id")).toBeNull();
  });

  it("blocks empty UA", () => {
    const req = createNextRequest("/auth/login", {
      headers: { "user-agent": "" },
    });
    const res = checkBot(req, "id");
    expect(res?.status).toBe(403);
  });

  it("blocks known scraper", () => {
    const req = createNextRequest("/auth/login", {
      headers: { "user-agent": "curl/7.88" },
    });
    const res = checkBot(req, "id");
    expect(res?.status).toBe(403);
  });

  it("blocks UA < 8 chars", () => {
    const req = createNextRequest("/auth/login", {
      headers: { "user-agent": "abc" },
    });
    const res = checkBot(req, "id");
    expect(res?.status).toBe(403);
  });
});
