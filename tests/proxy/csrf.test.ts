jest.mock("@/lib/log", () => require("../mock/mockLogger"));
jest.mock("@/proxy/session", () => require("../mock/mockSession"));
jest.mock("@upstash/ratelimit", () => require("../mock/mockRateLimit"));
jest.mock("@upstash/redis", () => require("../mock/mockRateLimit"));

global.crypto = {
  randomUUID: () => "test-uuid",
} as any;

import { checkCsrf } from "@/proxy/csrf";
import { createNextRequest } from "../mock/mockNext";

describe("csrf", () => {
  it("ignores safe methods", () => {
    const req = createNextRequest("/api/test", { method: "GET" });
    expect(checkCsrf(req, "id")).toBeNull();
  });

  it("blocks missing origin", () => {
    const req = createNextRequest("/api/test", {
      method: "POST",
      headers: { host: "example.com" },
    });
    const res = checkCsrf(req, "id");
    expect(res?.status).toBe(403);
  });

  it("blocks origin mismatch", () => {
    const req = createNextRequest("/api/test", {
      method: "POST",
      headers: {
        origin: "https://evil.com",
        host: "example.com",
      },
    });
    const res = checkCsrf(req, "id");
    expect(res?.status).toBe(403);
  });

  it("allows matching origin", () => {
    const req = createNextRequest("/api/test", {
      method: "POST",
      headers: {
        origin: "https://example.com",
        host: "example.com",
      },
    });
    expect(checkCsrf(req, "id")).toBeNull();
  });
});
