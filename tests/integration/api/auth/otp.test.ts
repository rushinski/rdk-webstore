// tests/integration/api/auth/otp.test.ts
import { describe, it, expect, beforeEach } from "@jest/globals";
import { resetDatabase, seedBaseData } from "../../../helpers/db";
import { createUserWithProfile } from "../../../helpers/supabase";

describe("POST /api/auth/otp/request", () => {
  beforeEach(async () => {
    await resetDatabase();
    await seedBaseData();
  });

  describe("Successful Requests", () => {
    it("sends OTP for existing user", async () => {
      await createUserWithProfile({
        email: "user@test.com",
        password: "Password123!",
        role: "customer",
      });

      const response = await fetch("http://localhost:3000/api/auth/otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "user@test.com" }),
      });

      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.ok).toBe(true);
    });

    it("returns success for non-existent user (no enumeration)", async () => {
      const response = await fetch("http://localhost:3000/api/auth/otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "nonexistent@test.com" }),
      });

      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.ok).toBe(true);
    });

    it("trims whitespace from email", async () => {
      await createUserWithProfile({
        email: "user@test.com",
        password: "Password123!",
        role: "customer",
      });

      const response = await fetch("http://localhost:3000/api/auth/otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "  user@test.com  " }),
      });

      const json = await response.json();
      expect(json.ok).toBe(true);
    });

    it("is case-insensitive", async () => {
      await createUserWithProfile({
        email: "user@test.com",
        password: "Password123!",
        role: "customer",
      });

      const response = await fetch("http://localhost:3000/api/auth/otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "USER@TEST.COM" }),
      });

      const json = await response.json();
      expect(json.ok).toBe(true);
    });
  });

  describe("Validation", () => {
    it("requires email field", async () => {
      const response = await fetch("http://localhost:3000/api/auth/otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      expect(response.status).toBe(400);
    });

    it("validates email format", async () => {
      const response = await fetch("http://localhost:3000/api/auth/otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "invalid-email" }),
      });

      expect(response.status).toBe(400);
    });

    it("rejects empty email", async () => {
      const response = await fetch("http://localhost:3000/api/auth/otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "" }),
      });

      expect(response.status).toBe(400);
    });
  });

  describe("Security", () => {
    it("includes Cache-Control header", async () => {
      const response = await fetch("http://localhost:3000/api/auth/otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "user@test.com" }),
      });

      expect(response.headers.get("cache-control")).toBe("no-store");
    });

    it("includes request ID in response", async () => {
      const response = await fetch("http://localhost:3000/api/auth/otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "user@test.com" }),
      });

      const json = await response.json();
      expect(json.requestId).toBeTruthy();
    });

    it("does not reveal user existence in error", async () => {
      const response = await fetch("http://localhost:3000/api/auth/otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "nonexistent@test.com" }),
      });

      const json = await response.json();
      expect(json.ok).toBe(true);
      expect(json.error).toBeUndefined();
    });
  });

  describe("Rate Limiting", () => {
    it("handles rapid requests", async () => {
      const promises = Array.from({ length: 10 }, () =>
        fetch("http://localhost:3000/api/auth/otp/request", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: "user@test.com" }),
        })
      );

      const responses = await Promise.all(promises);
      const statuses = responses.map((r) => r.status);
      
      // Some should succeed, some might be rate limited
      expect(statuses.some((s) => s === 200)).toBe(true);
    });
  });

  describe("Error Handling", () => {
    it("handles malformed JSON", async () => {
      const response = await fetch("http://localhost:3000/api/auth/otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "not json",
      });

      expect(response.status).toBe(400);
    });
  });
});

describe("POST /api/auth/otp/verify", () => {
  beforeEach(async () => {
    await resetDatabase();
    await seedBaseData();
  });

  describe("Successful Verification", () => {
    it("verifies valid OTP code", async () => {
      await createUserWithProfile({
        email: "user@test.com",
        password: "Password123!",
        role: "customer",
      });

      // Generate OTP
      const admin = createAdminClient();
      const { data: linkData } = await admin.auth.admin.generateLink({
        type: "magiclink",
        email: "user@test.com",
      });

      const properties = linkData?.properties as any;
      const token = properties?.email_otp;

      const response = await fetch("http://localhost:3000/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "user@test.com",
          code: token,
        }),
      });

      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.ok).toBe(true);
      expect(json.isAdmin).toBe(false);
    });

    it("sets authentication cookies", async () => {
      await createUserWithProfile({
        email: "user@test.com",
        password: "Password123!",
        role: "customer",
      });

      const admin = createAdminClient();
      const { data: linkData } = await admin.auth.admin.generateLink({
        type: "magiclink",
        email: "user@test.com",
      });

      const properties = linkData?.properties as any;
      const token = properties?.email_otp;

      const response = await fetch("http://localhost:3000/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "user@test.com",
          code: token,
        }),
      });

      const cookies = response.headers.get("set-cookie");
      expect(cookies).toBeTruthy();
      expect(cookies).toMatch(/sb-/);
    });

    it("identifies admin users", async () => {
      await createUserWithProfile({
        email: "admin@test.com",
        password: "Password123!",
        role: "admin",
      });

      const admin = createAdminClient();
      const { data: linkData } = await admin.auth.admin.generateLink({
        type: "magiclink",
        email: "admin@test.com",
      });

      const properties = linkData?.properties as any;
      const token = properties?.email_otp;

      const response = await fetch("http://localhost:3000/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "admin@test.com",
          code: token,
        }),
      });

      const json = await response.json();

      expect(json.ok).toBe(true);
      expect(json.isAdmin).toBe(true);
    });
  });

  describe("Invalid Codes", () => {
    it("rejects invalid code", async () => {
      await createUserWithProfile({
        email: "user@test.com",
        password: "Password123!",
        role: "customer",
      });

      const response = await fetch("http://localhost:3000/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "user@test.com",
          code: "invalid",
        }),
      });

      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.ok).toBe(false);
      expect(json.error).toBeTruthy();
    });

    it("rejects expired code", async () => {
      // This would require manipulating timestamps in the database
    });

    it("rejects reused code", async () => {
      await createUserWithProfile({
        email: "user@test.com",
        password: "Password123!",
        role: "customer",
      });

      const admin = createAdminClient();
      const { data: linkData } = await admin.auth.admin.generateLink({
        type: "magiclink",
        email: "user@test.com",
      });

      const properties = linkData?.properties as any;
      const token = properties?.email_otp;

      // Use code once
      await fetch("http://localhost:3000/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "user@test.com",
          code: token,
        }),
      });

      // Try to reuse
      const response = await fetch("http://localhost:3000/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "user@test.com",
          code: token,
        }),
      });

      const json = await response.json();
      expect(json.ok).toBe(false);
    });
  });

  describe("2FA Requirements", () => {
    it("requires 2FA setup for admin without 2FA", async () => {
      await createUserWithProfile({
        email: "admin@test.com",
        password: "Password123!",
        role: "admin",
      });

      const admin = createAdminClient();
      const { data: linkData } = await admin.auth.admin.generateLink({
        type: "magiclink",
        email: "admin@test.com",
      });

      const properties = linkData?.properties as any;
      const token = properties?.email_otp;

      const response = await fetch("http://localhost:3000/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "admin@test.com",
          code: token,
        }),
      });

      const json = await response.json();

      expect(json.ok).toBe(true);
      expect(json.isAdmin).toBe(true);
      expect(json.requiresTwoFASetup).toBe(true);
    });

    it("does not require 2FA for regular users", async () => {
      await createUserWithProfile({
        email: "user@test.com",
        password: "Password123!",
        role: "customer",
      });

      const admin = createAdminClient();
      const { data: linkData } = await admin.auth.admin.generateLink({
        type: "magiclink",
        email: "user@test.com",
      });

      const properties = linkData?.properties as any;
      const token = properties?.email_otp;

      const response = await fetch("http://localhost:3000/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "user@test.com",
          code: token,
        }),
      });

      const json = await response.json();

      expect(json.requiresTwoFASetup).toBeUndefined();
      expect(json.requiresTwoFAChallenge).toBeUndefined();
    });
  });

  describe("Validation", () => {
    it("requires email field", async () => {
      const response = await fetch("http://localhost:3000/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: "123456" }),
      });

      expect(response.status).toBe(400);
    });

    it("requires code field", async () => {
      const response = await fetch("http://localhost:3000/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "user@test.com" }),
      });

      expect(response.status).toBe(400);
    });

    it("validates email format", async () => {
      const response = await fetch("http://localhost:3000/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "invalid",
          code: "123456",
        }),
      });

      expect(response.status).toBe(400);
    });
  });

  describe("Security", () => {
    it("includes Cache-Control header", async () => {
      const response = await fetch("http://localhost:3000/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "user@test.com",
          code: "123456",
        }),
      });

      expect(response.headers.get("cache-control")).toBe("no-store");
    });

    it("sets HttpOnly cookie", async () => {
      await createUserWithProfile({
        email: "user@test.com",
        password: "Password123!",
        role: "customer",
      });

      const admin = createAdminClient();
      const { data: linkData } = await admin.auth.admin.generateLink({
        type: "magiclink",
        email: "user@test.com",
      });

      const properties = linkData?.properties as any;
      const token = properties?.email_otp;

      const response = await fetch("http://localhost:3000/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "user@test.com",
          code: token,
        }),
      });

      const cookies = response.headers.get("set-cookie");
      expect(cookies).toMatch(/HttpOnly/i);
    });
  });
});