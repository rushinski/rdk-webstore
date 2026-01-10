import { z } from "zod";
import { STRIPE_PAYOUT_INTERVALS, STRIPE_PAYOUT_WEEKLY_ANCHORS } from "@/config/constants/stripe";

export const stripePayoutsQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(100).default(50),
  })
  .strict();

export const stripePayoutCreateSchema = z
  .object({
    amount: z.coerce.number().int().positive(),
    currency: z.string().trim().toLowerCase().default("usd"),
    method: z.enum(["instant", "standard"]).default("standard"),
  })
  .strict();

export const stripeBankAccountSchema = z
  .object({
    bank_account_id: z.string().trim().min(1),
  })
  .strict();

export const stripePayoutScheduleSchema = z
  .object({
    interval: z.enum(STRIPE_PAYOUT_INTERVALS),
    weekly_anchor: z.enum(STRIPE_PAYOUT_WEEKLY_ANCHORS).optional(),
    monthly_anchor: z.coerce.number().int().min(1).max(31).optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.interval === "weekly" && !value.weekly_anchor) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "weekly_anchor is required for weekly payouts",
        path: ["weekly_anchor"],
      });
    }

    if (value.interval === "monthly" && !value.monthly_anchor) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "monthly_anchor is required for monthly payouts",
        path: ["monthly_anchor"],
      });
    }
  });
