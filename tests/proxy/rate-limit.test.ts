jest.mock("@/lib/log", () => require("../mock/mockLogger"));
jest.mock("@/proxy/session", () => require("../mock/mockSession"));
jest.mock("@/config/env", () => require("../mock/mockEnv"));
jest.mock("@upstash/ratelimit", () => require("../mock/mockRateLimit"));
jest.mock("@upstash/redis", () => require("../mock/mockRateLimit"));

global.crypto = {
  randomUUID: () => "test-uuid",
} as any;

import { applyRateLimit } from "@/proxy/rate-limit";

import { createNextRequest } from "../mock/mockNext";

const { mockLimiterInstance } = require("../mock/mockRateLimit");

describe("rate limit", () => {
  it("passes when success=true", async () => {
    mockLimiterInstance.limit.mockResolvedValue({
      success: true,
      remaining: 29,
      reset: 123,
      limit: 30,
    });

    const req = createNextRequest("/api/test");
    const res = await applyRateLimit(req, "id");

    expect(res).toBeNull();
  });

  it("returns 429 when rate-limited", async () => {
    mockLimiterInstance.limit.mockResolvedValue({
      success: false,
      remaining: 0,
      reset: 123,
      limit: 30,
    });

    const req = createNextRequest("/api/test");
    const res = await applyRateLimit(req, "id");

    expect(res?.status).toBe(429);
  });
});
