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

export const adminNotificationUpdateSchema = z
  .object({
    ids: z.array(z.string().uuid()).optional(),
    mark_all: z.boolean().optional(),
  })
  .strict()
  .refine(
    (value) => Boolean(value.mark_all) || (Array.isArray(value.ids) && value.ids.length > 0),
    { message: "Provide ids or mark_all" }
  );

export const adminPreferencesSchema = z
  .object({
    chat_notifications_enabled: z.boolean().optional(),
    admin_order_notifications_enabled: z.boolean().optional(),
  })
  .strict();

export const payoutSettingsSchema = z
  .object({
    provider: z.string().trim().max(80).nullable(),
    account_label: z.string().trim().max(140).nullable(),
    account_last4: z.string().trim().regex(/^[0-9]{4}$/).nullable(),
  })
  .strict();

const booleanFromQuery = z.preprocess((value) => {
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return normalized === "1" || normalized === "true";
  }
  if (typeof value === "number") {
    return value === 1;
  }
  if (typeof value === "boolean") {
    return value;
  }
  if (value === undefined || value === null) {
    return false;
  }
  return Boolean(value);
}, z.boolean());

export const adminNotificationsQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(50).default(20),
    page: z.coerce.number().int().min(1).default(1),
    unread: booleanFromQuery,
  })
  .strict();
