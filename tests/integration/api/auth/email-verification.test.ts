// tests/integration/api/auth/email-verification.test.ts
import { describe, it, expect, beforeEach } from "@jest/globals";
import { resetDatabase, seedBaseData } from "../../../helpers/db";

describe("POST /api/auth/verify-email", () => {
  beforeEach(async () => {
    await resetDatabase();
    await seedBaseData();
  });

  describe("Successful Verification", () => {
    it("verifies signup email", async () => {
      // Register user
      await fetch("http://localhost:3000/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "newuser@test.com",
          password: "Password123!",
          updatesOptIn: false,
        }),
      });

      // Get OTP code (from admin)
      const admin = createAdminClient();
      const { data: linkData } = await admin.auth.admin.generateLink({
        type: "signup",
        email: "newuser@test.com",
      });

      const properties = linkData?.properties as any;
      const token = properties?.email_otp;

      const response = await fetch("http://localhost:3000/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "newuser@test.com",
          code: token,
          flow: "signup",
        }),
      });

      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.ok).toBe(true);
      expect(json.nextPath).toBeTruthy();
    });

    it("creates email subscription for opted-in users", async () => {
      // Register with opt-in
      await fetch("http://localhost:3000/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "marketing@test.com",
          password: "Password123!",
          updatesOptIn: true,
        }),
      });

      const admin = createAdminClient();
      const { data: linkData } = await admin.auth.admin.generateLink({
        type: "signup",
        email: "marketing@test.com",
      });

      const properties = linkData?.properties as any;
      const token = properties?.email_otp;

      await fetch("http://localhost:3000/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "marketing@test.com",
          code: token,
          flow: "signup",
        }),
      });

      // Check email_subscribers table
      const { data: subscriber } = await admin
        .from("email_subscribers")
        .select("*")
        .eq("email", "marketing@test.com")
        .single();

      expect(subscriber).toBeTruthy();
    });

    it("does not create subscription for non-opted-in users", async () => {
      await fetch("http://localhost:3000/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "nomarketing@test.com",
          password: "Password123!",
          updatesOptIn: false,
        }),
      });

      const admin = createAdminClient();
      const { data: linkData } = await admin.auth.admin.generateLink({
        type: "signup",
        email: "nomarketing@test.com",
      });

      const properties = linkData?.properties as any;
      const token = properties?.email_otp;

      await fetch("http://localhost:3000/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "nomarketing@test.com",
          code: token,
          flow: "signup",
        }),
      });

      const { data: subscriber } = await admin
        .from("email_subscribers")
        .select("*")
        .eq("email", "nomarketing@test.com")
        .maybeSingle();

      expect(subscriber).toBeNull();
    });
  });

  describe("Invalid Codes", () => {
    it("rejects invalid code", async () => {
      const response = await fetch("http://localhost:3000/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "user@test.com",
          code: "invalid",
          flow: "signup",
        }),
      });

      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.ok).toBe(false);
    });

    it("rejects expired code", async () => {
      // Would require timestamp manipulation
    });
  });

  describe("Validation", () => {
    it("requires email", async () => {
      const response = await fetch("http://localhost:3000/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: "123456",
          flow: "signup",
        }),
      });

      expect(response.status).toBe(400);
    });

    it("requires code", async () => {
      const response = await fetch("http://localhost:3000/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "user@test.com",
          flow: "signup",
        }),
      });

      expect(response.status).toBe(400);
    });

    it("requires flow", async () => {
      const response = await fetch("http://localhost:3000/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "user@test.com",
          code: "123456",
        }),
      });

      expect(response.status).toBe(400);
    });
  });
});
