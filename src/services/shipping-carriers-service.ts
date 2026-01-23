// src/services/shipping-carriers-service.ts
import { z } from "zod";

import type { TypedSupabaseClient } from "@/lib/supabase/server";
import { ShippingCarriersRepository } from "@/repositories/shipping-carriers-repo";

// Keep aligned with UI
const allowedCarriers = ["UPS", "USPS", "FEDEX"] as const;

const carriersSchema = z
  .object({
    carriers: z.array(z.string()).default([]),
  })
  .strict();

export class ShippingCarriersService {
  private repo: ShippingCarriersRepository;

  constructor(private readonly supabase: TypedSupabaseClient) {
    this.repo = new ShippingCarriersRepository(supabase);
  }

  async getEnabledCarriers(): Promise<string[]> {
    const row = await this.repo.get();
    return row?.enabled_carriers ?? [];
  }

  async setEnabledCarriers(input: unknown): Promise<string[]> {
    const parsed = carriersSchema.parse(input);

    // normalize + validate
    const normalized = parsed.carriers
      .map((c) => String(c).trim())
      .filter(Boolean)
      .map((c) => c.toUpperCase());

    const filtered = normalized.filter((c) =>
      (allowedCarriers as readonly string[]).includes(c),
    );

    // unique
    const unique = Array.from(new Set(filtered));

    const saved = await this.repo.upsert(unique);
    return saved.enabled_carriers ?? [];
  }
}
