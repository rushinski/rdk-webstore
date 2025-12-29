import { z } from "zod";

export const analyticsTrackSchema = z
  .object({
    path: z.string().trim().min(1),
    referrer: z.string().trim().min(1).nullable().optional(),
    visitorId: z.string().trim().min(1),
    sessionId: z.string().trim().min(1),
  })
  .strict();
