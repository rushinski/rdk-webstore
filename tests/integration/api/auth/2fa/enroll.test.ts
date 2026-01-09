// tests/integration/api/auth/2fa/enroll.test.ts
import { describe, it, expect, beforeEach } from "@jest/globals";
import { resetDatabase, seedBaseData } from "../../../../helpers/db";
import { createUserWithProfile, signInUser } from "../../../../helpers/supabase";

describe("POST /api/auth/2fa/enroll", () => {
  beforeEach(async () => {
    await resetDatabase();
    await seedBaseData();
  });

  describe("Successful Enrollment", () => {
    it("generates QR code for admin user", async () => {
      const user = await createUserWithProfile({
        email: "admin@test.com",
        password: "Password123!",
        role: "admin",
      });

      const { client } = await signInUser("admin@test.com", "Password123!");
      const session = (await client.auth.getSession()).data.session;

      const response = await fetch("http://localhost:3000/api/auth/2fa/enroll", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: `sb-access-token=${session?.access_token}`,
        },
      });

      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.factorId).toBeTruthy();
      expect(json.qrCode).toBeTruthy();
      expect(json.uri).toBeTruthy();
    });

    it("includes TOTP URI", async () => {
      await createUserWithProfile({
        email: "admin@test.com",
        password: "Password123!",
        role: "admin",
      });

      const { client } = await signInUser("admin@test.com", "Password123!");
      const session = (await client.auth.getSession()).data.session;

      const response = await fetch("http://localhost:3000/api/auth/2fa/enroll", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: `sb-access-token=${session?.access_token}`,
        },
      });

      const json = await response.json();

      expect(json.uri).toMatch(/^otpauth:\/\/totp\//);
      expect(json.uri).toContain("secret=");
    });

    it("includes QR code as SVG data URL", async () => {
      await createUserWithProfile({
        email: "admin@test.com",
        password: "Password123!",
        role: "admin",
      });

      const { client } = await signInUser("admin@test.com", "Password123!");
      const session = (await client.auth.getSession()).data.session;

      const response = await fetch("http://localhost:3000/api/auth/2fa/enroll", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: `sb-access-token=${session?.access_token}`,
        },
      });

      const json = await response.json();

      expect(json.qrCode).toMatch(/^data:image\/svg\+xml/);
    });
  });

  describe("Authorization", () => {
    it("requires authentication", async () => {
      const response = await fetch("http://localhost:3000/api/auth/2fa/enroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      expect(response.status).toBe(401);
    });

    it("requires admin role", async () => {
      await createUserWithProfile({
        email: "user@test.com",
        password: "Password123!",
        role: "customer",
      });

      const { client } = await signInUser("user@test.com", "Password123!");
      const session = (await client.auth.getSession()).data.session;

      const response = await fetch("http://localhost:3000/api/auth/2fa/enroll", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: `sb-access-token=${session?.access_token}`,
        },
      });

      expect(response.status).toBe(403);
    });
  });

  describe("Security", () => {
    it("includes Cache-Control header", async () => {
      await createUserWithProfile({
        email: "admin@test.com",
        password: "Password123!",
        role: "admin",
      });

      const { client } = await signInUser("admin@test.com", "Password123!");
      const session = (await client.auth.getSession()).data.session;

      const response = await fetch("http://localhost:3000/api/auth/2fa/enroll", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: `sb-access-token=${session?.access_token}`,
        },
      });

      expect(response.headers.get("cache-control")).toBe("no-store");
    });

    it("includes request ID", async () => {
      await createUserWithProfile({
        email: "admin@test.com",
        password: "Password123!",
        role: "admin",
      });

      const { client } = await signInUser("admin@test.com", "Password123!");
      const session = (await client.auth.getSession()).data.session;

      const response = await fetch("http://localhost:3000/api/auth/2fa/enroll", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: `sb-access-token=${session?.access_token}`,
        },
      });

      const json = await response.json();
      expect(json.requestId).toBeTruthy();
    });
  });
});
