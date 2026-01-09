// tests/unit/lib/http/admin-session-cookie.test.ts
import { NextResponse } from "next/server";
import {
  setAdminSessionCookie,
  clearAdminSessionCookie,
} from "@/lib/http/admin-session-cookie";

describe("Admin Session Cookie", () => {
  describe("setAdminSessionCookie", () => {
    it("sets cookie on response", async () => {
      const response = NextResponse.json({ ok: true });
      const userId = "test-user-123";

      const result = await setAdminSessionCookie(response, userId);

      const cookies = result.cookies.getAll();
      const adminCookie = cookies.find((c) => c.name.includes("admin"));

      expect(adminCookie).toBeTruthy();
    });

    it("sets HttpOnly flag", async () => {
      const response = NextResponse.json({ ok: true });

      const result = await setAdminSessionCookie(response, "user-123");

      // HttpOnly flag should be set (check implementation)
      const cookieHeader = result.headers.get("set-cookie");
      expect(cookieHeader).toContain("HttpOnly");
    });

    it("sets Secure flag in production", async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "production";

      const response = NextResponse.json({ ok: true });
      const result = await setAdminSessionCookie(response, "user-123");

      const cookieHeader = result.headers.get("set-cookie");
      expect(cookieHeader).toContain("Secure");

      process.env.NODE_ENV = originalEnv;
    });

    it("does not set Secure flag in development", async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "development";

      const response = NextResponse.json({ ok: true });
      const result = await setAdminSessionCookie(response, "user-123");

      const cookieHeader = result.headers.get("set-cookie");
      expect(cookieHeader).not.toContain("Secure");

      process.env.NODE_ENV = originalEnv;
    });

    it("sets SameSite=Strict", async () => {
      const response = NextResponse.json({ ok: true });
      const result = await setAdminSessionCookie(response, "user-123");

      const cookieHeader = result.headers.get("set-cookie");
      expect(cookieHeader).toContain("SameSite=Strict");
    });

    it("sets Path=/", async () => {
      const response = NextResponse.json({ ok: true });
      const result = await setAdminSessionCookie(response, "user-123");

      const cookieHeader = result.headers.get("set-cookie");
      expect(cookieHeader).toContain("Path=/");
    });

    it("sets MaxAge", async () => {
      const response = NextResponse.json({ ok: true });
      const result = await setAdminSessionCookie(response, "user-123");

      const cookieHeader = result.headers.get("set-cookie");
      expect(cookieHeader).toMatch(/Max-Age=\d+/);
    });

    it("preserves other cookies", async () => {
      const response = NextResponse.json({ ok: true });
      response.cookies.set("other-cookie", "value");

      const result = await setAdminSessionCookie(response, "user-123");

      const cookies = result.cookies.getAll();
      expect(cookies.length).toBeGreaterThan(1);
      expect(cookies.some((c) => c.name === "other-cookie")).toBe(true);
    });
  });

  describe("clearAdminSessionCookie", () => {
    it("clears cookie from response", () => {
      const response = NextResponse.json({ ok: true });

      const result = clearAdminSessionCookie(response);

      const cookieHeader = result.headers.get("set-cookie");
      expect(cookieHeader).toContain("Max-Age=0");
    });

    it("sets expiration in past", () => {
      const response = NextResponse.json({ ok: true });

      const result = clearAdminSessionCookie(response);

      const cookieHeader = result.headers.get("set-cookie");
      expect(cookieHeader).toMatch(/expires=.*1970/);
    });

    it("maintains security flags", () => {
      const response = NextResponse.json({ ok: true });

      const result = clearAdminSessionCookie(response);

      const cookieHeader = result.headers.get("set-cookie");
      expect(cookieHeader).toContain("HttpOnly");
      expect(cookieHeader).toContain("SameSite=Strict");
    });

    it("preserves other cookies", () => {
      const response = NextResponse.json({ ok: true });
      response.cookies.set("other-cookie", "value");

      const result = clearAdminSessionCookie(response);

      const otherCookie = result.cookies.get("other-cookie");
      expect(otherCookie).toBeTruthy();
      expect(otherCookie?.value).toBe("value");
    });
  });
});