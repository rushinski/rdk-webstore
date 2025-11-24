jest.mock("@/lib/log", () => require("../mock/mockLogger"));
jest.mock("@/proxy/session", () => require("../mock/mockSession"));
jest.mock("@upstash/ratelimit", () => require("../mock/mockRateLimit"));
jest.mock("@upstash/redis", () => require("../mock/mockRateLimit"));

global.crypto = {
  randomUUID: () => "test-uuid",
} as any;

import { applySecurityHeaders } from "@/proxy/security-headers";
import { NextResponse } from "next/server";

describe("security headers", () => {
  it("applies core headers", () => {
    const res = NextResponse.next();
    applySecurityHeaders(res);

    expect(res.headers.get("X-Frame-Options")).toBe("DENY");
    expect(res.headers.get("Content-Security-Policy")).toContain("default-src 'self'");
  });
});
