// tests/integration/api/auth/2fa/challenge.test.ts
import { describe, it, expect, beforeEach } from "@jest/globals";
import { resetDatabase, seedBaseData } from "../../../../helpers/db";
import { createUserWithProfile, signInUser } from "../../../../helpers/supabase";

describe("POST /api/auth/2fa/challenge/start", () => {
  beforeEach(async () => {
    await resetDatabase();
    await seedBaseData();
  });

  describe("Authorization", () => {
    it("requires authentication", async () => {
      const response = await fetch("http://localhost:3000/api/auth/2fa/challenge/start", {
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

      const response = await fetch("http://localhost:3000/api/auth/2fa/challenge/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: `sb-access-token=${session?.access_token}`,
        },
      });

      expect(response.status).toBe(403);
    });

    it("requires enrolled 2FA", async () => {
      await createUserWithProfile({
        email: "admin@test.com",
        password: "Password123!",
        role: "admin",
      });

      const { client } = await signInUser("admin@test.com", "Password123!");
      const session = (await client.auth.getSession()).data.session;

      const response = await fetch("http://localhost:3000/api/auth/2fa/challenge/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: `sb-access-token=${session?.access_token}`,
        },
      });

      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.error).toMatch(/no.*enrolled/i);
    });
  });
});

describe("POST /api/auth/2fa/challenge/verify", () => {
  beforeEach(async () => {
    await resetDatabase();
    await seedBaseData();
  });

  describe("Validation", () => {
    it("requires factorId", async () => {
      const response = await fetch("http://localhost:3000/api/auth/2fa/challenge/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          challengeId: "test-challenge",
          code: "123456",
        }),
      });

      expect(response.status).toBe(400);
    });

    it("requires challengeId", async () => {
      const response = await fetch("http://localhost:3000/api/auth/2fa/challenge/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          factorId: "test-factor",
          code: "123456",
        }),
      });

      expect(response.status).toBe(400);
    });

    it("requires code", async () => {
      const response = await fetch("http://localhost:3000/api/auth/2fa/challenge/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          factorId: "test-factor",
          challengeId: "test-challenge",
        }),
      });

      expect(response.status).toBe(400);
    });
  });

  describe("Authorization", () => {
    it("requires authentication", async () => {
      const response = await fetch("http://localhost:3000/api/auth/2fa/challenge/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          factorId: "test-factor",
          challengeId: "test-challenge",
          code: "123456",
        }),
      });

      expect(response.status).toBe(401);
    });
  });
});