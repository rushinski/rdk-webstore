// tests/integration/api/auth/logout.test.ts
import { describe, it, expect, beforeEach } from "@jest/globals";
import { resetDatabase, seedBaseData } from "../../../helpers/db";
import { createUserWithProfile, signInUser } from "../../../helpers/supabase";

describe("POST /api/auth/logout", () => {
  beforeEach(async () => {
    await resetDatabase();
    await seedBaseData();
  });

  describe("Successful Logout", () => {
    it("logs out authenticated user", async () => {
      await createUserWithProfile({
        email: "user@test.com",
        password: "Password123!",
        role: "customer",
      });

      const { client } = await signInUser("user@test.com", "Password123!");
      const session = (await client.auth.getSession()).data.session;

      const response = await fetch("http://localhost:3000/api/auth/logout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: `sb-access-token=${session?.access_token}`,
        },
      });

      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.ok).toBe(true);
    });

    it("clears session cookies", async () => {
      await createUserWithProfile({
        email: "user@test.com",
        password: "Password123!",
        role: "customer",
      });

      const { client } = await signInUser("user@test.com", "Password123!");
      const session = (await client.auth.getSession()).data.session;

      const response = await fetch("http://localhost:3000/api/auth/logout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: `sb-access-token=${session?.access_token}`,
        },
      });

      const cookies = response.headers.get("set-cookie");
      expect(cookies).toBeTruthy();
      expect(cookies).toMatch(/Max-Age=0|expires=/i);
    });

    it("clears admin session cookie", async () => {
      await createUserWithProfile({
        email: "admin@test.com",
        password: "Password123!",
        role: "admin",
      });

      const { client } = await signInUser("admin@test.com", "Password123!");
      const session = (await client.auth.getSession()).data.session;

      const response = await fetch("http://localhost:3000/api/auth/logout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: `sb-access-token=${session?.access_token}`,
        },
      });

      const cookies = response.headers.get("set-cookie");
      expect(cookies).toContain("admin-session");
    });
  });

  describe("Error Cases", () => {
    it("handles logout when not authenticated", async () => {
      const response = await fetch("http://localhost:3000/api/auth/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      // Should still return success to avoid leaking state
      expect([200, 401]).toContain(response.status);
    });
  });

  describe("Security", () => {
    it("includes Cache-Control header", async () => {
      const response = await fetch("http://localhost:3000/api/auth/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      expect(response.headers.get("cache-control")).toBe("no-store");
    });
  });
});