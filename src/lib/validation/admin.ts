// src/lib/validation/admin.ts
import { z } from "zod";

export const adminInviteCreateSchema = z
  .object({
    role: z.enum(["admin", "super_admin"]),
  })
  .strict();

export const adminInviteAcceptSchema = z
  .object({
    token: z.string().trim().min(32),
  })
  .strict();

export const storeAccessSettingsSchema = z
  .object({
    checkoutLockEnabled: z.boolean(),
    checkoutLockMessage: z.string().trim().min(1).max(500).optional(),
  })
  .strict();
