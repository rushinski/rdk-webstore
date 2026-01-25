// src/services/order-access-token-service.ts

import type { TypedSupabaseClient } from "@/lib/supabase/server";
import { generateOrderAccessToken, hashToken } from "@/lib/utils/crypto";
import { OrderAccessTokensRepository } from "@/repositories/order-access-tokens-repo";
import { env } from "@/config/env";

const DEFAULT_TOKEN_TTL_DAYS = 30;

export class OrderAccessTokenService {
  private tokensRepo: OrderAccessTokensRepository;

  constructor(private readonly supabase: TypedSupabaseClient) {
    this.tokensRepo = new OrderAccessTokensRepository(supabase);
  }

  async createToken(input: { orderId: string; ttlDays?: number }) {
    const token = generateOrderAccessToken();
    const tokenHash = hashToken(token, env.ORDER_ACCESS_TOKEN_SECRET);
    const ttlDays = input.ttlDays ?? DEFAULT_TOKEN_TTL_DAYS;
    const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000).toISOString();

    await this.tokensRepo.insertToken({
      orderId: input.orderId,
      tokenHash,
      expiresAt,
    });

    return { token, expiresAt };
  }

  async verifyToken(input: { orderId: string; token: string }) {
    const tokenHash = hashToken(input.token, env.ORDER_ACCESS_TOKEN_SECRET);
    const now = new Date().toISOString();

    const record = await this.tokensRepo.findValidToken({
      orderId: input.orderId,
      tokenHash,
      now,
    });

    if (!record) {
      return null;
    }

    await this.tokensRepo.touchLastUsed(record.id);
    return record;
  }
}
