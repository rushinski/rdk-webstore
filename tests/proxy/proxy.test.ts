jest.mock("@/lib/log", () => require("../mock/mockLogger"));
jest.mock("@/proxy/session", () => require("../mock/mockSession"));
jest.mock("@upstash/ratelimit", () => require("../mock/mockRateLimit"));
jest.mock("@upstash/redis", () => require("../mock/mockRateLimit"));
jest.mock("@/config/env", () => require("../mock/mockEnv"));
jest.mock("@upstash/ratelimit", () => require("../mock/mockRateLimit"));
jest.mock("@upstash/redis", () => require("../mock/mockRateLimit"));

global.crypto = {
  randomUUID: () => "test-uuid",
} as any;

import { proxy } from "../../proxy";
import { createNextRequest } from "../mock/mockNext";

describe("proxy integration", () => {
  it("returns NextResponse.next when no blockers", async () => {
    const req = createNextRequest("/products");
    const res = await proxy(req);
    expect(res.headers.get("x-request-id")).toBeDefined();
  });

  it("runs canonicalization early", async () => {
    const req = createNextRequest("/Products/");
    const res = await proxy(req);
    expect(res.status).toBe(308);
  });
});
