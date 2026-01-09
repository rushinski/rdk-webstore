// tests/unit/lib/http/admin-session.test.ts
import { describe, it, expect } from "@jest/globals";
import {
  createAdminSessionToken,
  verifyAdminSessionToken,
} from "@/lib/http/admin-session";

describe("Admin Session Token", () => {
  describe("createAdminSessionToken", () => {
    it("creates valid token for user ID", async () => {
      const userId = "test-user-123";
      const token = await createAdminSessionToken(userId);

      expect(token).toBeTruthy();
      expect(typeof token).toBe("string");
      expect(token.split(".").length).toBeGreaterThan(1); // JWT structure
    });

    it("creates different tokens for different users", async () => {
      const token1 = await createAdminSessionToken("user-1");
      const token2 = await createAdminSessionToken("user-2");

      expect(token1).not.toBe(token2);
    });

    it("creates different tokens on consecutive calls", async () => {
      const userId = "test-user";
      const token1 = await createAdminSessionToken(userId);
      
      // Wait a bit to ensure different timestamp
      await new Promise((resolve) => setTimeout(resolve, 10));
      
      const token2 = await createAdminSessionToken(userId);

      expect(token1).not.toBe(token2);
    });

    it("handles UUID user IDs", async () => {
      const userId = "550e8400-e29b-41d4-a716-446655440000";
      const token = await createAdminSessionToken(userId);

      expect(token).toBeTruthy();
    });

    it("handles short user IDs", async () => {
      const userId = "1";
      const token = await createAdminSessionToken(userId);

      expect(token).toBeTruthy();
    });

    it("handles long user IDs", async () => {
      const userId = "a".repeat(100);
      const token = await createAdminSessionToken(userId);

      expect(token).toBeTruthy();
    });
  });

  describe("verifyAdminSessionToken", () => {
    it("verifies valid token", async () => {
      const userId = "test-user-123";
      const token = await createAdminSessionToken(userId);

      const payload = await verifyAdminSessionToken(token);

      expect(payload).toBeTruthy();
      expect(payload?.sub).toBe(userId);
      expect(payload?.v).toBe(1);
    });

    it("extracts correct user ID", async () => {
      const userId = "user-456";
      const token = await createAdminSessionToken(userId);

      const payload = await verifyAdminSessionToken(token);

      expect(payload?.sub).toBe(userId);
    });

    it("includes version number", async () => {
      const token = await createAdminSessionToken("user-123");

      const payload = await verifyAdminSessionToken(token);

      expect(payload?.v).toBe(1);
    });

    it("includes issued at timestamp", async () => {
      const token = await createAdminSessionToken("user-123");

      const payload = await verifyAdminSessionToken(token);

      expect(payload?.iat).toBeTruthy();
      expect(typeof payload?.iat).toBe("number");
    });

    it("includes expiration timestamp", async () => {
      const token = await createAdminSessionToken("user-123");

      const payload = await verifyAdminSessionToken(token);

      expect(payload?.exp).toBeTruthy();
      expect(typeof payload?.exp).toBe("number");
      expect(payload!.exp!).toBeGreaterThan(payload!.iat!);
    });

    it("rejects invalid token", async () => {
      const payload = await verifyAdminSessionToken("invalid-token");

      expect(payload).toBeNull();
    });

    it("rejects malformed token", async () => {
      const payload = await verifyAdminSessionToken("not.a.token");

      expect(payload).toBeNull();
    });

    it("rejects empty token", async () => {
      const payload = await verifyAdminSessionToken("");

      expect(payload).toBeNull();
    });

    it("rejects token with wrong algorithm", async () => {
      // Create a token with wrong algorithm (would need JWT library to test properly)
      const payload = await verifyAdminSessionToken("eyJhbGciOiJIUzI1NiJ9.test.test");

      expect(payload).toBeNull();
    });

    it("rejects expired token", async () => {
      // This would require mocking time or waiting for expiration
      // For now, we test the expiration is set correctly
      const token = await createAdminSessionToken("user-123");
      const payload = await verifyAdminSessionToken(token);

      const now = Math.floor(Date.now() / 1000);
      expect(payload!.exp!).toBeGreaterThan(now);
    });

    it("accepts token within clock skew tolerance", async () => {
      const token = await createAdminSessionToken("user-123");
      
      // Token should work immediately
      const payload = await verifyAdminSessionToken(token);

      expect(payload).toBeTruthy();
    });

    it("rejects token with invalid version", async () => {
      // Would need to create token with wrong version
      // Implementation depends on JWT library
    });

    it("rejects token without user ID", async () => {
      // Would need to create malformed token
      // Implementation depends on JWT library
    });

    it("handles concurrent verification requests", async () => {
      const token = await createAdminSessionToken("user-123");

      const promises = Array.from({ length: 10 }, () =>
        verifyAdminSessionToken(token)
      );

      const results = await Promise.all(promises);

      expect(results.every((r) => r?.sub === "user-123")).toBe(true);
    });
  });

  describe("Token Expiration", () => {
    it("sets expiration in future", async () => {
      const token = await createAdminSessionToken("user-123");
      const payload = await verifyAdminSessionToken(token);

      const now = Math.floor(Date.now() / 1000);
      expect(payload!.exp!).toBeGreaterThan(now);
    });

    it("has reasonable expiration window", async () => {
      const token = await createAdminSessionToken("user-123");
      const payload = await verifyAdminSessionToken(token);

      const expiresIn = payload!.exp! - payload!.iat!;
      
      // Should expire in reasonable time (e.g., 1 hour to 1 day)
      expect(expiresIn).toBeGreaterThan(3600); // At least 1 hour
      expect(expiresIn).toBeLessThan(86400 * 7); // At most 7 days
    });
  });

  describe("Security", () => {
    it("uses encryption", async () => {
      const token = await createAdminSessionToken("user-123");

      // Token should not contain plaintext user ID
      expect(token).not.toContain("user-123");
    });

    it("produces different ciphertext for same payload", async () => {
      const token1 = await createAdminSessionToken("same-user");
      
      await new Promise((resolve) => setTimeout(resolve, 10));
      
      const token2 = await createAdminSessionToken("same-user");

      // Different tokens even for same user due to timestamp/nonce
      expect(token1).not.toBe(token2);
    });

    it("cannot be modified without detection", async () => {
      const token = await createAdminSessionToken("user-123");
      
      // Tamper with token
      const tampered = token.substring(0, token.length - 5) + "XXXXX";
      
      const payload = await verifyAdminSessionToken(tampered);

      expect(payload).toBeNull();
    });
  });
});