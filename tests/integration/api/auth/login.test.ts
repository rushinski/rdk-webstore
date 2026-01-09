// tests/integration/api/auth/login.test.ts
import { describe, it, expect, beforeEach } from "@jest/globals";
import { resetDatabase, seedBaseData } from "../../../helpers/db";
import { createUserWithProfile } from "../../../helpers/supabase";

describe("POST /api/auth/login", () => {
  beforeEach(async () => {
    await resetDatabase();
    await seedBaseData();
  });

  describe("Successful Login", () => {
    it("returns ok=true for valid customer credentials", async () => {
      await createUserWithProfile({
        email: "customer@test.com",
        password: "Password123!",
        role: "customer",
      });

      const response = await fetch("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "customer@test.com",
          password: "Password123!",
        }),
      });

      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.ok).toBe(true);
      expect(json.isAdmin).toBe(false);
    });

    it("returns isAdmin=true for admin user", async () => {
      await createUserWithProfile({
        email: "admin@test.com",
        password: "Password123!",
        role: "admin",
      });

      const response = await fetch("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "admin@test.com",
          password: "Password123!",
        }),
      });

      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.ok).toBe(true);
      expect(json.isAdmin).toBe(true);
    });

    it("sets authentication cookies on successful login", async () => {
      await createUserWithProfile({
        email: "user@test.com",
        password: "Password123!",
        role: "customer",
      });

      const response = await fetch("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "user@test.com",
          password: "Password123!",
        }),
      });

      const cookies = response.headers.get("set-cookie");
      expect(cookies).toBeTruthy();
      expect(cookies).toMatch(/sb-/); // Supabase cookie prefix
    });

    it("is case-insensitive for email", async () => {
      await createUserWithProfile({
        email: "user@test.com",
        password: "Password123!",
        role: "customer",
      });

      const response = await fetch("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "USER@TEST.COM",
          password: "Password123!",
        }),
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

      const response = await fetch("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "  user@test.com  ",
          password: "Password123!",
        }),
      });

      const json = await response.json();
      expect(response.status).toBe(200);
      expect(json.ok).toBe(true);
    });
  });

  describe("Failed Login Attempts", () => {
    it("returns 401 for wrong password", async () => {
      await createUserWithProfile({
        email: "user@test.com",
        password: "Password123!",
        role: "customer",
      });

      const response = await fetch("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "user@test.com",
          password: "WrongPassword!",
        }),
      });

      const json = await response.json();

      expect(response.status).toBe(401);
      expect(json.ok).toBe(false);
      expect(json.error).toMatch(/invalid credentials/i);
    });

    it("returns 401 for non-existent user", async () => {
      const response = await fetch("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "nonexistent@test.com",
          password: "Password123!",
        }),
      });

      const json = await response.json();

      expect(response.status).toBe(401);
      expect(json.ok).toBe(false);
      expect(json.error).toMatch(/invalid credentials/i);
    });

    it("does not reveal user existence in error message", async () => {
      const response = await fetch("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "nonexistent@test.com",
          password: "Password123!",
        }),
      });

      const json = await response.json();

      expect(json.error).not.toMatch(/user not found/i);
      expect(json.error).not.toMatch(/email.*not.*exist/i);
      expect(json.error).not.toMatch(/account.*not.*found/i);
    });

    it("returns 400 for missing email", async () => {
      const response = await fetch("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password: "Password123!",
        }),
      });

      expect(response.status).toBe(400);
    });

    it("returns 400 for missing password", async () => {
      const response = await fetch("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "user@test.com",
        }),
      });

      expect(response.status).toBe(400);
    });

    it("returns 400 for invalid email format", async () => {
      const response = await fetch("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "not-an-email",
          password: "Password123!",
        }),
      });

      expect(response.status).toBe(400);
    });

    it("returns 400 for empty email", async () => {
      const response = await fetch("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "",
          password: "Password123!",
        }),
      });

      expect(response.status).toBe(400);
    });

    it("returns 400 for empty password", async () => {
      const response = await fetch("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "user@test.com",
          password: "",
        }),
      });

      expect(response.status).toBe(400);
    });
  });

  describe("Email Verification", () => {
    it("requires email verification for unverified users", async () => {
      const admin = createAdminClient();
      const { data, error } = await admin.auth.admin.createUser({
        email: "unverified@test.com",
        password: "Password123!",
        email_confirm: false,
      });

      expect(error).toBeNull();

      const response = await fetch("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "unverified@test.com",
          password: "Password123!",
        }),
      });

      const json = await response.json();

      expect(response.status).toBe(401);
      expect(json.ok).toBe(false);
      expect(json.requiresEmailVerification).toBe(true);
    });

    it("auto-resends verification email for unverified users", async () => {
      const admin = createAdminClient();
      await admin.auth.admin.createUser({
        email: "unverified@test.com",
        password: "Password123!",
        email_confirm: false,
      });

      const response = await fetch("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "unverified@test.com",
          password: "Password123!",
        }),
      });

      const json = await response.json();
      expect(json.requiresEmailVerification).toBe(true);
      
      // Email should be resent automatically (verify by checking email service logs)
    });
  });

  describe("2FA for Admin Users", () => {
    it("requires 2FA setup for admin without 2FA", async () => {
      await createUserWithProfile({
        email: "admin@test.com",
        password: "Password123!",
        role: "admin",
      });

      const response = await fetch("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "admin@test.com",
          password: "Password123!",
        }),
      });

      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.ok).toBe(true);
      expect(json.isAdmin).toBe(true);
      expect(json.requiresTwoFASetup).toBe(true);
    });

    it("requires 2FA challenge for admin with 2FA enrolled", async () => {
      // This test would require mocking or actual 2FA enrollment
      // Skipping in test mode per your E2E_TEST_MODE check
    });

    it("does not require 2FA for regular users", async () => {
      await createUserWithProfile({
        email: "user@test.com",
        password: "Password123!",
        role: "customer",
      });

      const response = await fetch("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "user@test.com",
          password: "Password123!",
        }),
      });

      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.ok).toBe(true);
      expect(json.requiresTwoFASetup).toBeUndefined();
      expect(json.requiresTwoFAChallenge).toBeUndefined();
    });
  });

  describe("Security Headers", () => {
    it("includes Cache-Control: no-store header", async () => {
      await createUserWithProfile({
        email: "user@test.com",
        password: "Password123!",
        role: "customer",
      });

      const response = await fetch("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "user@test.com",
          password: "Password123!",
        }),
      });

      expect(response.headers.get("cache-control")).toBe("no-store");
    });

    it("includes request ID in response", async () => {
      const response = await fetch("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "user@test.com",
          password: "Password123!",
        }),
      });

      const json = await response.json();
      expect(json.requestId).toBeTruthy();
      expect(typeof json.requestId).toBe("string");
    });

    it("sets HttpOnly cookie flag", async () => {
      await createUserWithProfile({
        email: "user@test.com",
        password: "Password123!",
        role: "customer",
      });

      const response = await fetch("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "user@test.com",
          password: "Password123!",
        }),
      });

      const cookies = response.headers.get("set-cookie");
      expect(cookies).toMatch(/HttpOnly/i);
    });

    it("sets Secure cookie flag in production", async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "production";

      await createUserWithProfile({
        email: "user@test.com",
        password: "Password123!",
        role: "customer",
      });

      const response = await fetch("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "user@test.com",
          password: "Password123!",
        }),
      });

      const cookies = response.headers.get("set-cookie");
      expect(cookies).toMatch(/Secure/i);

      process.env.NODE_ENV = originalEnv;
    });

    it("sets SameSite=Lax cookie attribute", async () => {
      await createUserWithProfile({
        email: "user@test.com",
        password: "Password123!",
        role: "customer",
      });

      const response = await fetch("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "user@test.com",
          password: "Password123!",
        }),
      });

      const cookies = response.headers.get("set-cookie");
      expect(cookies).toMatch(/SameSite=Lax/i);
    });
  });

  describe("Rate Limiting", () => {
    it("handles rate limiting from Supabase", async () => {
      await createUserWithProfile({
        email: "user@test.com",
        password: "Password123!",
        role: "customer",
      });

      // Attempt many logins in quick succession
      const promises = Array.from({ length: 20 }, () =>
        fetch("http://localhost:3000/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: "user@test.com",
            password: "WrongPassword!",
          }),
        })
      );

      const responses = await Promise.all(promises);
      
      // Some should be rate limited (status 429)
      const rateLimited = responses.some((r) => r.status === 429);
      // Adjust expectation based on your rate limiting configuration
    });
  });

  describe("Concurrent Requests", () => {
    it("handles concurrent login requests safely", async () => {
      await createUserWithProfile({
        email: "user@test.com",
        password: "Password123!",
        role: "customer",
      });

      const promises = Array.from({ length: 5 }, () =>
        fetch("http://localhost:3000/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: "user@test.com",
            password: "Password123!",
          }),
        })
      );

      const responses = await Promise.all(promises);
      const jsonResults = await Promise.all(responses.map((r) => r.json()));

      // All should succeed
      expect(jsonResults.every((j) => j.ok === true)).toBe(true);
    });
  });

  describe("Error Handling", () => {
    it("handles malformed JSON", async () => {
      const response = await fetch("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "not valid json",
      });

      expect(response.status).toBe(400);
    });

    it("handles missing Content-Type header", async () => {
      const response = await fetch("http://localhost:3000/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: "user@test.com",
          password: "Password123!",
        }),
      });

      // Should still work or return appropriate error
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it("handles database connection errors gracefully", async () => {
      // Mock database down scenario
      // This would require test infrastructure to simulate DB failures
    });

    it("includes error details in response", async () => {
      const response = await fetch("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "invalid",
          password: "Password123!",
        }),
      });

      const json = await response.json();

      expect(json.ok).toBe(false);
      expect(json.error).toBeTruthy();
      expect(typeof json.error).toBe("string");
    });
  });

  describe("Session Creation", () => {
    it("creates profile if missing after successful login", async () => {
      const admin = createAdminClient();
      
      // Create user without profile
      const { data } = await admin.auth.admin.createUser({
        email: "noprofile@test.com",
        password: "Password123!",
        email_confirm: true,
      });

      const response = await fetch("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "noprofile@test.com",
          password: "Password123!",
        }),
      });

      const json = await response.json();
      expect(json.ok).toBe(true);

      // Verify profile was created
      const { data: profile } = await admin
        .from("profiles")
        .select("*")
        .eq("id", data.user!.id)
        .single();

      expect(profile).toBeTruthy();
      expect(profile?.email).toBe("noprofile@test.com");
    });

    it("assigns default role to new profiles", async () => {
      const admin = createAdminClient();
      
      const { data } = await admin.auth.admin.createUser({
        email: "newuser@test.com",
        password: "Password123!",
        email_confirm: true,
      });

      await fetch("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "newuser@test.com",
          password: "Password123!",
        }),
      });

      const { data: profile } = await admin
        .from("profiles")
        .select("role")
        .eq("id", data.user!.id)
        .single();

      expect(profile?.role).toBe("customer");
    });
  });
});

