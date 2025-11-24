jest.mock("@/lib/log", () => require("../mock/mockLogger"));
jest.mock("@/proxy/session", () => require("../mock/mockSession"));
jest.mock("@upstash/ratelimit", () => require("../mock/mockRateLimit"));
jest.mock("@upstash/redis", () => require("../mock/mockRateLimit"));

global.crypto = {
  randomUUID: () => "test-uuid",
} as any;

import { createRequestId } from "@/proxy/request-id";

describe("request-id", () => {
  it("generates deterministic id with mocked crypto", () => {
    expect(createRequestId()).toBe("req-test-uuid");
  });
});
