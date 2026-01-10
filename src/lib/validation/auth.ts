// src/lib/validation/auth.ts
import { z } from "zod";

const emailSchema = z.string().trim().email();
const passwordSchema = z.string().trim().min(1);
const otpCodeSchema = z.string().trim().regex(/^\d{6}$/);

export const loginSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
  })
  .strict();

export const registerSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    updatesOptIn: z.boolean().optional().default(false),
  })
  .strict();

export const emailOnlySchema = z
  .object({
    email: emailSchema,
  })
  .strict();

export const updatePasswordSchema = z
  .object({
    password: passwordSchema,
  })
  .strict();

export const verifyEmailSchema = z
  .object({
    email: emailSchema,
    code: otpCodeSchema,
    flow: z.enum(["signup", "signin"]),
  })
  .strict();

export const resendVerificationSchema = z
  .object({
    email: emailSchema,
    flow: z.enum(["signup", "signin"]).default("signup"),
  })
  .strict();

export const otpVerifySchema = z
  .object({
    email: emailSchema,
    code: otpCodeSchema,
  })
  .strict();

export const twoFactorVerifyEnrollmentSchema = z
  .object({
    factorId: z.string().trim().min(1),
    code: otpCodeSchema,
  })
  .strict();

export const twoFactorChallengeVerifySchema = z
  .object({
    factorId: z.string().trim().min(1),
    challengeId: z.string().trim().min(1),
    code: otpCodeSchema,
  })
  .strict();
