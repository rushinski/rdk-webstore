// tests/unit/lib/crypto.test.ts
import { generatePublicToken, hashString, createCartHash } from "@/lib/crypto";

describe("Unit: Crypto Utilities", () => {
  describe("generatePublicToken", () => {
    it("generates a token", () => {
      const token = generatePublicToken();
      expect(token).toBeTruthy();
      expect(typeof token).toBe("string");
    });

    it("generates hex string", () => {
      const token = generatePublicToken();
      expect(token).toMatch(/^[0-9a-f]+$/);
    });

    it("generates 64 character token", () => {
      const token = generatePublicToken();
      expect(token.length).toBe(64); // 32 bytes = 64 hex chars
    });

    it("generates unique tokens", () => {
      const token1 = generatePublicToken();
      const token2 = generatePublicToken();
      expect(token1).not.toBe(token2);
    });

    it("generates different tokens in loop", () => {
      const tokens = Array.from({ length: 100 }, () => generatePublicToken());
      const uniqueTokens = new Set(tokens);
      expect(uniqueTokens.size).toBe(100);
    });
  });

  describe("hashString", () => {
    it("hashes a string", () => {
      const hash = hashString("test");
      expect(hash).toBeTruthy();
      expect(typeof hash).toBe("string");
    });

    it("returns hex string", () => {
      const hash = hashString("test");
      expect(hash).toMatch(/^[0-9a-f]+$/);
    });

    it("returns consistent hash", () => {
      const hash1 = hashString("test");
      const hash2 = hashString("test");
      expect(hash1).toBe(hash2);
    });

    it("returns different hash for different input", () => {
      const hash1 = hashString("test1");
      const hash2 = hashString("test2");
      expect(hash1).not.toBe(hash2);
    });

    it("handles empty string", () => {
      const hash = hashString("");
      expect(hash).toBeTruthy();
      expect(hash.length).toBeGreaterThan(0);
    });

    it("handles unicode", () => {
      const hash = hashString("你好世界");
      expect(hash).toBeTruthy();
    });

    it("handles very long strings", () => {
      const longString = "a".repeat(10000);
      const hash = hashString(longString);
      expect(hash).toBeTruthy();
    });

    it("produces different hash for case differences", () => {
      const hash1 = hashString("Test");
      const hash2 = hashString("test");
      expect(hash1).not.toBe(hash2);
    });

    it("produces different hash for whitespace differences", () => {
      const hash1 = hashString("test");
      const hash2 = hashString(" test");
      expect(hash1).not.toBe(hash2);
    });
  });

  describe("createCartHash", () => {
    it("creates hash for cart data", () => {
      const items = [{ productId: "123", quantity: 1 }];
      const hash = createCartHash(items, "ship");
      
      expect(hash).toBeTruthy();
      expect(typeof hash).toBe("string");
    });

    it("returns consistent hash for same cart", () => {
      const items = [{ productId: "123", quantity: 1 }];
      const hash1 = createCartHash(items, "ship");
      const hash2 = createCartHash(items, "ship");
      
      expect(hash1).toBe(hash2);
    });

    it("returns different hash for different items", () => {
      const items1 = [{ productId: "123", quantity: 1 }];
      const items2 = [{ productId: "456", quantity: 1 }];
      const hash1 = createCartHash(items1, "ship");
      const hash2 = createCartHash(items2, "ship");
      
      expect(hash1).not.toBe(hash2);
    });

    it("returns different hash for different fulfillment", () => {
      const items = [{ productId: "123", quantity: 1 }];
      const hash1 = createCartHash(items, "ship");
      const hash2 = createCartHash(items, "pickup");
      
      expect(hash1).not.toBe(hash2);
    });

    it("returns different hash for different quantities", () => {
      const items1 = [{ productId: "123", quantity: 1 }];
      const items2 = [{ productId: "123", quantity: 2 }];
      const hash1 = createCartHash(items1, "ship");
      const hash2 = createCartHash(items2, "ship");
      
      expect(hash1).not.toBe(hash2);
    });

    it("handles empty cart", () => {
      const hash = createCartHash([], "ship");
      expect(hash).toBeTruthy();
    });

    it("handles multiple items", () => {
      const items = [
        { productId: "123", quantity: 1 },
        { productId: "456", quantity: 2 },
      ];
      const hash = createCartHash(items, "ship");
      expect(hash).toBeTruthy();
    });

    it("normalizes item order", () => {
      const items1 = [
        { productId: "123", quantity: 1 },
        { productId: "456", quantity: 2 },
      ];
      const items2 = [
        { productId: "456", quantity: 2 },
        { productId: "123", quantity: 1 },
      ];
      const hash1 = createCartHash(items1, "ship");
      const hash2 = createCartHash(items2, "ship");
      
      // Should produce same hash due to canonical ordering
      expect(hash1).toBe(hash2);
    });
  });
});