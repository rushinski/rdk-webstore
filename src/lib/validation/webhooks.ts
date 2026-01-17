import { z } from "zod";

export const shippoWebhookQuerySchema = z
  .object({
    token: z.string().trim().optional(),
  })
  .strict();

const trackingStatusSchema = z
  .object({
    status: z.string(),
  })
  .passthrough();

export const shippoWebhookEventSchema = z
  .object({
    event: z.string(),
    data: z.record(z.string(), z.unknown()).optional(),
  })
  .passthrough();

export const shippoTrackingUpdateSchema = z
  .object({
    event: z.literal("track_updated"),
    data: z
      .object({
        tracking_number: z.string().optional(),
        trackingNumber: z.string().optional(),
        tracking_status: trackingStatusSchema.optional(),
        trackingStatus: trackingStatusSchema.optional(),
        carrier: z.string().optional(),
        tracking_url_provider: z.string().optional(),
        trackingUrlProvider: z.string().optional(),
      })
      .passthrough(),
  })
  .passthrough();
