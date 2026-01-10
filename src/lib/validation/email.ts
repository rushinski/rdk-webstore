// src/lib/validation/email.ts
import { z } from "zod";

export const emailSubscribeSchema = z
  .object({
    email: z.string().trim().email(),
    source: z.string().trim().min(1).optional(),
  })
  .strict();

export const emailConfirmTokenSchema = z
  .object({
    token: z.string().trim().min(32),
  })
  .strict();
