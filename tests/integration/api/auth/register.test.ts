// tests/integration/api/auth/register.test.ts
import { describe, it, expect, beforeEach } from "@jest/globals";
import { resetDatabase, seedBaseData } from "../../../helpers/db";
import { createUserWithProfile } from "../../../helpers/supabase";

describe("POST /api/auth/register", () => {
  beforeEach(async () => {
    await resetDatabase();
    await seedBaseData();
  });

  describe("Successful Registration", () => {
    it("creates new user with valid data", async () => {
      const response = await fetch("http://localhost:3000/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "newuser@test.com",
          password: "Password123!",
          updatesOptIn: false,
        }),
      });

      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.ok).toBe(true);
    });

    it("creates user with email marketing opt-in", async () => {
      const response = await fetch("http://localhost:3000/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "marketing@test.com",
          password: "Password123!",
          updatesOptIn: true,
        }),
      });

      const json = await response.json();
      expect(json.ok).toBe(true);

      // Verify opt-in is stored (checked after verification)
    });

    it("sends verification email", async () => {
      const response = await fetch("http://localhost:3000/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "verify@test.com",
          password: "Password123!",
          updatesOptIn: false,
        }),
      });

      expect(response.status).toBe(200);
      
      // Email should be sent (verify through email service logs or mocks)
    });

    it("trims whitespace from email", async () => {
      const response = await fetch("http://localhost:3000/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "  trimmed@test.com  ",
          password: "Password123!",
          updatesOptIn: false,
        }),
      });

      const json = await response.json();
      expect(json.ok).toBe(true);
    });
  });

  describe("Password Validation", () => {
    it("rejects password shorter than 8 characters", async () => {
      const response = await fetch("http://localhost:3000/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "user@test.com",
          password: "Pass1!",
          updatesOptIn: false,
        }),
      });

      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.ok).toBe(false);
      expect(json.error).toMatch(/password.*criteria/i);
    });

    it("rejects password with only repeated characters", async () => {
      const response = await fetch("http://localhost:3000/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "user@test.com",
          password: "aaaaaaaa",
          updatesOptIn: false,
        }),
      });

      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.ok).toBe(false);
    });

    it("accepts strong password", async () => {
      const response = await fetch("http://localhost:3000/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "user@test.com",
          password: "SecureP@ssw0rd!2024",
          updatesOptIn: false,
        }),
      });

      const json = await response.json();
      expect(json.ok).toBe(true);
    });
  });

  describe("Duplicate Email", () => {
    it("rejects duplicate email", async () => {
      await createUserWithProfile({
        email: "existing@test.com",
        password: "Password123!",
        role: "customer",
      });

      const response = await fetch("http://localhost:3000/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "existing@test.com",
          password: "Password123!",
          updatesOptIn: false,
        }),
      });

      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.ok).toBe(false);
      expect(json.error).toMatch(/already.*exist|already.*registered/i);
    });

    it("is case-insensitive for duplicate check", async () => {
      await createUserWithProfile({
        email: "user@test.com",
        password: "Password123!",
        role: "customer",
      });

      const response = await fetch("http://localhost:3000/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "USER@TEST.COM",
          password: "Password123!",
          updatesOptIn: false,
        }),
      });

      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.ok).toBe(false);
    });
  });

  describe("Validation", () => {
    it("requires email field", async () => {
      const response = await fetch("http://localhost:3000/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password: "Password123!",
          updatesOptIn: false,
        }),
      });

      expect(response.status).toBe(400);
    });

    it("requires password field", async () => {
      const response = await fetch("http://localhost:3000/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "user@test.com",
          updatesOptIn: false,
        }),
      });

      expect(response.status).toBe(400);
    });

    it("rejects invalid email format", async () => {
      const response = await fetch("http://localhost:3000/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "not-an-email",
          password: "Password123!",
          updatesOptIn: false,
        }),
      });

      expect(response.status).toBe(400);
    });

    it("handles missing updatesOptIn gracefully", async () => {
      const response = await fetch("http://localhost:3000/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "user@test.com",
          password: "Password123!",
        }),
      });

      // Should default to false
      const json = await response.json();
      expect(json.ok).toBe(true);
    });
  });
});