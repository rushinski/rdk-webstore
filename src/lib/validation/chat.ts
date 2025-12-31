import { z } from "zod";

export const chatIdParamsSchema = z.object({
  chatId: z.string().uuid(),
});

export const createChatSchema = z
  .object({
    orderId: z.string().uuid().optional(),
  })
  .strict();

export const sendChatMessageSchema = z
  .object({
    message: z.string().trim().min(1).max(2000),
  })
  .strict();

export const guestChatSchema = z
  .object({
    orderId: z.string().uuid(),
    token: z.string().trim().min(32),
  })
  .strict();

export const guestChatMessageSchema = z
  .object({
    orderId: z.string().uuid(),
    token: z.string().trim().min(32),
    message: z.string().trim().min(1).max(2000),
  })
  .strict();

export const listChatsQuerySchema = z
  .object({
    status: z.enum(["open", "closed"]).optional(),
  })
  .strict();
