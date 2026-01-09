// src/lib/validation/email.ts
import { z } from "zod";

export const emailSubscribeSchema = z
  .object({
    email: z.string().trim().email(),
    source: z.string().trim().min(1).optional(),
  })
  .strict();
