// tests/unit/lib/validation/password.test.ts
import { describe, it, expect } from "@jest/globals";
import {
  isPasswordValid,
  evaluatePasswordRequirements,
} from "@/lib/validation/password";

describe("Password Validation", () => {
  describe("isPasswordValid", () => {
    it("accepts password with 8+ characters", () => {
      expect(isPasswordValid("Password123!")).toBe(true);
    });

    it("accepts password with exactly 8 characters", () => {
      expect(isPasswordValid("Pass123!")).toBe(true);
    });

    it("rejects password with less than 8 characters", () => {
      expect(isPasswordValid("Pass1!")).toBe(false);
    });

    it("rejects password with only repeated characters", () => {
      expect(isPasswordValid("aaaaaaaa")).toBe(false);
    });

    it("accepts password with varied characters", () => {
      expect(isPasswordValid("SecureP@ss123")).toBe(true);
    });

    it("accepts password with special characters", () => {
      expect(isPasswordValid("P@ssw0rd!#$%")).toBe(true);
    });

    it("accepts password with spaces", () => {
      expect(isPasswordValid("Pass Word 123!")).toBe(true);
    });

    it("rejects empty string", () => {
      expect(isPasswordValid("")).toBe(false);
    });

    it("rejects null", () => {
      expect(isPasswordValid(null as any)).toBe(false);
    });

    it("rejects undefined", () => {
      expect(isPasswordValid(undefined as any)).toBe(false);
    });

    it("accepts very long password", () => {
      const longPassword = "a".repeat(50) + "B1!";
      expect(isPasswordValid(longPassword)).toBe(true);
    });

    it("accepts password with unicode characters", () => {
      expect(isPasswordValid("Pässw0rd123!")).toBe(true);
    });

    it("accepts password with emojis", () => {
      expect(isPasswordValid("Password123!🔒")).toBe(true);
    });

    it("rejects whitespace-only password", () => {
      expect(isPasswordValid("        ")).toBe(false);
    });

    it("rejects password with mostly repeated characters", () => {
      expect(isPasswordValid("aaaaaaab")).toBe(false);
    });
  });

  describe("evaluatePasswordRequirements", () => {
    it("returns all requirements for valid password", () => {
      const result = evaluatePasswordRequirements("SecurePass123!");
      
      expect(result.minLength).toBe(true);
      expect(result.notRepeatedChar).toBe(true);
    });

    it("identifies short password", () => {
      const result = evaluatePasswordRequirements("Short1");
      
      expect(result.minLength).toBe(false);
    });

    it("identifies repeated character password", () => {
      const result = evaluatePasswordRequirements("aaaaaaaa");
      
      expect(result.notRepeatedChar).toBe(false);
    });

    it("handles empty string", () => {
      const result = evaluatePasswordRequirements("");
      
      expect(result.minLength).toBe(false);
      expect(result.notRepeatedChar).toBe(false);
    });

    it("handles password with exactly 8 characters", () => {
      const result = evaluatePasswordRequirements("Pass123!");
      
      expect(result.minLength).toBe(true);
    });

    it("handles password with 7 characters", () => {
      const result = evaluatePasswordRequirements("Pass12!");
      
      expect(result.minLength).toBe(false);
    });

    it("identifies varied character password", () => {
      const result = evaluatePasswordRequirements("abcdefgh");
      
      expect(result.notRepeatedChar).toBe(true);
    });

    it("handles password with alternating repeated chars", () => {
      const result = evaluatePasswordRequirements("abababab");
      
      expect(result.notRepeatedChar).toBe(true);
    });

    it("handles password with mostly same char", () => {
      const result = evaluatePasswordRequirements("aaaaabcd");
      
      expect(result.notRepeatedChar).toBe(false);
    });
  });

  describe("Common Password Patterns", () => {
    it("accepts complex passwords", () => {
      const complexPasswords = [
        "MyP@ssw0rd2024!",
        "Tr0ub4dor&3",
        "correct-horse-battery-staple",
        "G00dP@ss!",
        "SecureP@ssword123",
      ];

      complexPasswords.forEach((pwd) => {
        expect(isPasswordValid(pwd)).toBe(true);
      });
    });

    it("rejects simple repeated patterns", () => {
      const weakPasswords = [
        "11111111",
        "aaaaaaaa",
        "12341234",
        "abcdabcd",
      ];

      weakPasswords.forEach((pwd) => {
        expect(isPasswordValid(pwd)).toBe(false);
      });
    });
  });

  describe("Edge Cases", () => {
    it("handles password with only numbers", () => {
      expect(isPasswordValid("12345678")).toBe(true);
    });

    it("handles password with only letters", () => {
      expect(isPasswordValid("abcdefgh")).toBe(true);
    });

    it("handles password with mixed case", () => {
      expect(isPasswordValid("AbCdEfGh")).toBe(true);
    });

    it("handles password starting with number", () => {
      expect(isPasswordValid("1Password")).toBe(true);
    });

    it("handles password ending with symbol", () => {
      expect(isPasswordValid("Password!")).toBe(true);
    });
  });
});