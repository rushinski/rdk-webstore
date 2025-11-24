jest.mock("@/lib/log", () => require("../mock/mockLogger"));
jest.mock("@/proxy/session", () => require("../mock/mockSession"));
jest.mock("@upstash/ratelimit", () => require("../mock/mockRateLimit"));
jest.mock("@upstash/redis", () => require("../mock/mockRateLimit"));

global.crypto = {
  randomUUID: () => "test-uuid",
} as any;

import { canonicalizePath } from "@/proxy/canonicalize";
import { createNextRequest } from "../mock/mockNext";

describe("canonicalizePath", () => {
  it("redirects uppercase → lowercase", () => {
    const req = createNextRequest("/Admin/Panel");
    const res = canonicalizePath(req, "req-1");
    expect(res?.status).toBe(308);
    expect(res?.headers.get("x-request-id")).toBe("req-1");
  });

  it("redirects trailing slashes", () => {
    const req = createNextRequest("/auth/login/");
    const res = canonicalizePath(req, "req-2");
    expect(res?.status).toBe(308);
  });

  it("returns null when path does not change", () => {
    const req = createNextRequest("/auth/login");
    const res = canonicalizePath(req, "req-3");
    expect(res).toBeNull();
  });
});
