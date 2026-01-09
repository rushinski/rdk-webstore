// tests/integration/api/auth/session.test.ts
import { describe, it, expect, beforeEach } from "@jest/globals";
import { resetDatabase, seedBaseData } from "../../../helpers/db";
import { createUserWithProfile, signInUser } from "../../../helpers/supabase";

describe("GET /api/auth/session", () => {
  beforeEach(async () => {
    await resetDatabase();
    await seedBaseData();
  });

  describe("Authenticated User", () => {
    it("returns user session data", async () => {
      await createUserWithProfile({
        email: "user@test.com",
        password: "Password123!",
        role: "customer",
      });

      const { client } = await signInUser("user@test.com", "Password123!");
      const session = (await client.auth.getSession()).data.session;

      const response = await fetch("http://localhost:3000/api/auth/session", {
        headers: {
          Cookie: `sb-access-token=${session?.access_token}`,
        },
      });

      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.user).toBeTruthy();
      expect(json.user.email).toBe("user@test.com");
      expect(json.role).toBe("customer");
    });

    it("returns admin role for admin user", async () => {
      await createUserWithProfile({
        email: "admin@test.com",
        password: "Password123!",
        role: "admin",
      });

      const { client } = await signInUser("admin@test.com", "Password123!");
      const session = (await client.auth.getSession()).data.session;

      const response = await fetch("http://localhost:3000/api/auth/session", {
        headers: {
          Cookie: `sb-access-token=${session?.access_token}`,
        },
      });

      const json = await response.json();

      expect(json.role).toBe("admin");
    });
  });

  describe("Unauthenticated User", () => {
    it("returns null for unauthenticated request", async () => {
      const response = await fetch("http://localhost:3000/api/auth/session");

      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.user).toBeNull();
      expect(json.role).toBeNull();
    });
  });

  describe("Security", () => {
    it("includes Cache-Control header", async () => {
      const response = await fetch("http://localhost:3000/api/auth/session");

      expect(response.headers.get("cache-control")).toBe("no-store");
    });

    it("does not expose sensitive user data", async () => {
      await createUserWithProfile({
        email: "user@test.com",
        password: "Password123!",
        role: "customer",
      });

      const { client } = await signInUser("user@test.com", "Password123!");
      const session = (await client.auth.getSession()).data.session;

      const response = await fetch("http://localhost:3000/api/auth/session", {
        headers: {
          Cookie: `sb-access-token=${session?.access_token}`,
        },
      });

      const json = await response.json();

      expect(json.user.password).toBeUndefined();
      expect(json.user.hashed_password).toBeUndefined();
    });
  });
});