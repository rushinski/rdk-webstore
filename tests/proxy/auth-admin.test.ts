// --- Module Mocks ---
jest.mock("@/lib/log", () => require("../mock/mockLogger"));
jest.mock("@/proxy/session", () => require("../mock/mockSession"));
jest.mock("@upstash/ratelimit", () => require("../mock/mockRateLimit"));
jest.mock("@upstash/redis", () => require("../mock/mockRateLimit"));
jest.mock("@/config/env", () => require("../mock/mockEnv"));

// Mock crypto UUID for consistent request-id
global.crypto = {
  randomUUID: () => "test-uuid",
} as any;

import { NextResponse } from "next/server";

import { protectAdminRoute } from "@/proxy/auth";

import { getSessionFromRequest } from "../mock/mockSession";
import { createNextRequest } from "../mock/mockNext";

// --- FIX: Mock redirect() so relative URLs work in Jest ---
jest.spyOn(NextResponse, "redirect").mockImplementation(((url: string | URL) => {
  return {
    status: 302,
    headers: new Map(),
    redirected: true,
    url,
  } as any;
}) as any);

describe("admin guard", () => {
  it("redirects when no session", async () => {
    getSessionFromRequest.mockResolvedValue({ user: null });

    const req = createNextRequest("/admin", {
      headers: { host: "localhost" },
    });

    const res = await protectAdminRoute(req, "req-1");
    expect(res?.status).toBe(302);
  });

  it("blocks customer role", async () => {
    getSessionFromRequest.mockResolvedValue({
      user: { id: "x", role: "customer" },
    });

    const req = createNextRequest("/admin", {
      headers: { host: "localhost" },
    });

    const res = await protectAdminRoute(req, "req-2");
    expect(res?.status).toBe(302);
  });

  it("allows admin role", async () => {
    getSessionFromRequest.mockResolvedValue({
      user: { id: "x", role: "admin", twoFactorEnabled: true },
    });

    const req = createNextRequest("/admin", {
      headers: { host: "localhost" },
    });

    const res = await protectAdminRoute(req, "req-3");
    expect(res).toBeNull();
  });
});
