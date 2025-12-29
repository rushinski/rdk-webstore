import { z } from "zod";

const emailSchema = z.string().trim().email();
const passwordSchema = z.string().trim().min(1);

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
    code: z.string().trim().min(1),
    flow: z.enum(["signup", "signin"]).default("signin"),
  })
  .strict();

export const resendVerificationSchema = z
  .object({
    email: emailSchema,
    flow: z.enum(["signup", "signin"]).optional(),
  })
  .strict();

export const otpVerifySchema = z
  .object({
    email: emailSchema,
    code: z.string().trim().min(1),
  })
  .strict();

export const twoFactorVerifyEnrollmentSchema = z
  .object({
    factorId: z.string().trim().min(1),
    code: z.string().trim().min(1),
  })
  .strict();

export const twoFactorChallengeVerifySchema = z
  .object({
    factorId: z.string().trim().min(1),
    challengeId: z.string().trim().min(1),
    code: z.string().trim().min(1),
  })
  .strict();
