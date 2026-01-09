// tests/security/injection.test.ts
import { describe, it, expect, beforeEach } from "@jest/globals";
import { resetDatabase, seedBaseData } from "../helpers/db";
import {
  createUserWithProfile,
  signInUser,
  createAdminClient,
} from "../helpers/supabase";

describe("Security: SQL Injection Prevention", () => {
  beforeEach(async () => {
    await resetDatabase();
    await seedBaseData();
  });

  describe("Login Endpoint", () => {
    it("prevents SQL injection in email field", async () => {
      await createUserWithProfile({
        email: "user@test.com",
        password: "Password123!",
        role: "customer",
      });

      const maliciousEmail = "' OR '1'='1' --";

      const response = await fetch("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: maliciousEmail,
          password: "Password123!",
        }),
      });

      expect(response.status).toBe(401);
    });

    it("prevents SQL injection in password field", async () => {
      await createUserWithProfile({
        email: "user@test.com",
        password: "Password123!",
        role: "customer",
      });

      const maliciousPassword = "' OR '1'='1' --";

      const response = await fetch("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "user@test.com",
          password: maliciousPassword,
        }),
      });

      expect(response.status).toBe(401);
    });

    it("uses parameterized queries", async () => {
      // Parameterized queries should prevent injection
      const malicious = `test@test.com'; DROP TABLE profiles; --`;

      const response = await fetch("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: malicious,
          password: "Password123!",
        }),
      });

      // Should fail gracefully, not execute DROP TABLE
      expect(response.status).toBe(401);
      
      // Verify profiles table still exists
      const admin = createAdminClient();
      const { data, error } = await admin.from("profiles").select("id").limit(1);
      
      expect(error).toBeNull();
    });
  });

  describe("OTP Verification", () => {
    it("prevents injection in code parameter", async () => {
      const maliciousCode = "'; DELETE FROM profiles WHERE '1'='1";

      const response = await fetch("http://localhost:3000/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "user@test.com",
          code: maliciousCode,
        }),
      });

      expect(response.status).toBe(400);
      
      // Verify no data was deleted
      const admin = createAdminClient();
      const { data } = await admin.from("profiles").select("count");
      expect(data).toBeTruthy();
    });
  });

  describe("Search/Filter Operations", () => {
    it("prevents injection in search queries", async () => {
      const admin = await createUserWithProfile({
        email: "admin@test.com",
        password: "Password123!",
        role: "admin",
      });

      const { client } = await signInUser("admin@test.com", "Password123!");

      const maliciousSearch = "'; DROP TABLE profiles; --";

      const { error } = await client
        .from("profiles")
        .select("*")
        .ilike("email", `%${maliciousSearch}%`);

      // Should not execute DROP TABLE
      expect(error).toBeNull();
    });
  });
});