// tests/security/timing-attacks.test.ts
import { describe, it, expect, beforeEach } from "@jest/globals";
import { resetDatabase, seedBaseData } from "../helpers/db";
import { createUserWithProfile } from "../helpers/supabase";

describe("Security: Timing Attack Prevention", () => {
  beforeEach(async () => {
    await resetDatabase();
    await seedBaseData();
  });

  describe("Login Timing", () => {
    it("has consistent timing for valid/invalid emails", async () => {
      await createUserWithProfile({
        email: "existing@test.com",
        password: "Password123!",
        role: "customer",
      });

      // Test with existing email
      const start1 = Date.now();
      await fetch("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "existing@test.com",
          password: "WrongPassword!",
        }),
      });
      const time1 = Date.now() - start1;

      // Test with non-existing email
      const start2 = Date.now();
      await fetch("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "nonexistent@test.com",
          password: "WrongPassword!",
        }),
      });
      const time2 = Date.now() - start2;

      // Times should be similar (within reasonable threshold)
      const difference = Math.abs(time1 - time2);
      expect(difference).toBeLessThan(100); // 100ms threshold
    });
  });

  describe("Password Verification Timing", () => {
    it("has consistent timing regardless of password correctness", async () => {
      await createUserWithProfile({
        email: "user@test.com",
        password: "CorrectPassword123!",
        role: "customer",
      });

      // Measure timing for wrong password
      const start1 = Date.now();
      await fetch("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "user@test.com",
          password: "WrongPassword!",
        }),
      });
      const time1 = Date.now() - start1;

      // Measure timing for almost-correct password
      const start2 = Date.now();
      await fetch("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "user@test.com",
          password: "CorrectPassword123",
        }),
      });
      const time2 = Date.now() - start2;

      const difference = Math.abs(time1 - time2);
      expect(difference).toBeLessThan(100);
    });
  });
});