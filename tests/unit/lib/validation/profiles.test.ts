// tests/unit/lib/validation/auth-schemas.test.ts
import {
  loginSchema,
  registerSchema,
  emailOnlySchema,
  otpVerifySchema,
  updatePasswordSchema,
  verifyEmailSchema,
  resendVerificationSchema,
  twoFactorVerifyEnrollmentSchema,
  twoFactorChallengeVerifySchema,
} from "@/lib/validation/auth";

describe("Auth Validation Schemas", () => {
  describe("loginSchema", () => {
    it("validates correct login data", () => {
      const data = {
        email: "user@test.com",
        password: "Password123!",
      };

      const result = loginSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it("rejects missing email", () => {
      const data = {
        password: "Password123!",
      };

      const result = loginSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it("rejects missing password", () => {
      const data = {
        email: "user@test.com",
      };

      const result = loginSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it("rejects invalid email format", () => {
      const data = {
        email: "invalid-email",
        password: "Password123!",
      };

      const result = loginSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it("rejects empty email", () => {
      const data = {
        email: "",
        password: "Password123!",
      };

      const result = loginSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it("rejects empty password", () => {
      const data = {
        email: "user@test.com",
        password: "",
      };

      const result = loginSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it("trims whitespace from email", () => {
      const data = {
        email: "  user@test.com  ",
        password: "Password123!",
      };

      const result = loginSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe("user@test.com");
      }
    });
  });

  describe("registerSchema", () => {
    it("validates correct registration data", () => {
      const data = {
        email: "user@test.com",
        password: "Password123!",
        updatesOptIn: false,
      };

      const result = registerSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it("accepts updatesOptIn as true", () => {
      const data = {
        email: "user@test.com",
        password: "Password123!",
        updatesOptIn: true,
      };

      const result = registerSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it("defaults updatesOptIn to false", () => {
      const data = {
        email: "user@test.com",
        password: "Password123!",
      };

      const result = registerSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.updatesOptIn).toBe(false);
      }
    });

    it("rejects invalid email", () => {
      const data = {
        email: "invalid",
        password: "Password123!",
        updatesOptIn: false,
      };

      const result = registerSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it("rejects missing password", () => {
      const data = {
        email: "user@test.com",
        updatesOptIn: false,
      };

      const result = registerSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe("emailOnlySchema", () => {
    it("validates correct email", () => {
      const data = { email: "user@test.com" };

      const result = emailOnlySchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it("rejects missing email", () => {
      const data = {};

      const result = emailOnlySchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it("rejects invalid email", () => {
      const data = { email: "invalid" };

      const result = emailOnlySchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it("trims whitespace", () => {
      const data = { email: "  user@test.com  " };

      const result = emailOnlySchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe("user@test.com");
      }
    });
  });

  describe("otpVerifySchema", () => {
    it("validates correct OTP data", () => {
      const data = {
        email: "user@test.com",
        code: "123456",
      };

      const result = otpVerifySchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it("rejects missing email", () => {
      const data = { code: "123456" };

      const result = otpVerifySchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it("rejects missing code", () => {
      const data = { email: "user@test.com" };

      const result = otpVerifySchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it("trims code whitespace", () => {
      const data = {
        email: "user@test.com",
        code: "  123456  ",
      };

      const result = otpVerifySchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.code).toBe("123456");
      }
    });
  });

  describe("updatePasswordSchema", () => {
    it("validates correct password", () => {
      const data = { password: "NewPassword123!" };

      const result = updatePasswordSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it("rejects missing password", () => {
      const data = {};

      const result = updatePasswordSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it("rejects empty password", () => {
      const data = { password: "" };

      const result = updatePasswordSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it("accepts minimum length password", () => {
      const data = { password: "Pass123!" };

      const result = updatePasswordSchema.safeParse(data);
      expect(result.success).toBe(true);
    });
  });

  describe("verifyEmailSchema", () => {
    it("validates correct verification data", () => {
      const data = {
        email: "user@test.com",
        code: "123456",
        flow: "signup" as const,
      };

      const result = verifyEmailSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it("accepts signin flow", () => {
      const data = {
        email: "user@test.com",
        code: "123456",
        flow: "signin" as const,
      };

      const result = verifyEmailSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it("rejects invalid flow", () => {
      const data = {
        email: "user@test.com",
        code: "123456",
        flow: "invalid",
      };

      const result = verifyEmailSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it("rejects missing flow", () => {
      const data = {
        email: "user@test.com",
        code: "123456",
      };

      const result = verifyEmailSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe("resendVerificationSchema", () => {
    it("validates correct resend data", () => {
      const data = {
        email: "user@test.com",
        flow: "signup" as const,
      };

      const result = resendVerificationSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it("accepts signin flow", () => {
      const data = {
        email: "user@test.com",
        flow: "signin" as const,
      };

      const result = resendVerificationSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it("defaults to signup flow", () => {
      const data = {
        email: "user@test.com",
      };

      const result = resendVerificationSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.flow).toBe("signup");
      }
    });
  });

  describe("twoFactorVerifyEnrollmentSchema", () => {
    it("validates correct 2FA enrollment data", () => {
      const data = {
        factorId: "factor-123",
        code: "123456",
      };

      const result = twoFactorVerifyEnrollmentSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it("rejects missing factorId", () => {
      const data = { code: "123456" };

      const result = twoFactorVerifyEnrollmentSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it("rejects missing code", () => {
      const data = { factorId: "factor-123" };

      const result = twoFactorVerifyEnrollmentSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it("validates 6-digit code", () => {
      const data = {
        factorId: "factor-123",
        code: "123456",
      };

      const result = twoFactorVerifyEnrollmentSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it("rejects code with less than 6 digits", () => {
      const data = {
        factorId: "factor-123",
        code: "12345",
      };

      const result = twoFactorVerifyEnrollmentSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it("rejects code with more than 6 digits", () => {
      const data = {
        factorId: "factor-123",
        code: "1234567",
      };

      const result = twoFactorVerifyEnrollmentSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe("twoFactorChallengeVerifySchema", () => {
    it("validates correct challenge data", () => {
      const data = {
        factorId: "factor-123",
        challengeId: "challenge-456",
        code: "123456",
      };

      const result = twoFactorChallengeVerifySchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it("rejects missing factorId", () => {
      const data = {
        challengeId: "challenge-456",
        code: "123456",
      };

      const result = twoFactorChallengeVerifySchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it("rejects missing challengeId", () => {
      const data = {
        factorId: "factor-123",
        code: "123456",
      };

      const result = twoFactorChallengeVerifySchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it("rejects missing code", () => {
      const data = {
        factorId: "factor-123",
        challengeId: "challenge-456",
      };

      const result = twoFactorChallengeVerifySchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });
});