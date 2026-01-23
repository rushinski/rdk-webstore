// src/repositories/addresses-repo.ts

import type { TypedSupabaseClient } from "@/lib/supabase/server";
import type { Tables, TablesInsert } from "@/types/db/database.types";

type OrderShippingInsert = TablesInsert<"order_shipping">;
type OrderShippingRow = Tables<"order_shipping">;
type UserAddressRow = Tables<"user_addresses">;
type UserAddressInsert = TablesInsert<"user_addresses">;

export interface AddressInput {
  name?: string | null;
  phone?: string | null;
  line1?: string | null;
  line2?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  country?: string | null;
}

export class AddressesRepository {
  constructor(private readonly supabase: TypedSupabaseClient) {}

  async insertOrderShippingSnapshot(
    orderId: string,
    address: AddressInput,
  ): Promise<void> {
    const insert: OrderShippingInsert = {
      order_id: orderId,
      name: address.name ?? null,
      phone: address.phone ?? null,
      line1: address.line1 ?? null,
      line2: address.line2 ?? null,
      city: address.city ?? null,
      state: address.state ?? null,
      postal_code: address.postalCode ?? null,
      country: address.country ?? null,
    };

    const { error } = await this.supabase.from("order_shipping").insert(insert);

    if (error && (error as any).code !== "23505") {
      // ignore duplicate key
      throw error;
    }
  }

  async upsertUserAddress(userId: string, address: AddressInput): Promise<void> {
    // Check if user already has this exact address
    const { data: existing } = await this.supabase
      .from("user_addresses")
      .select("id")
      .eq("user_id", userId)
      .eq("line1", address.line1 ?? "")
      .eq("postal_code", address.postalCode ?? "")
      .maybeSingle();

    if (existing) {
      // Address already exists, update it
      const { error } = await this.supabase
        .from("user_addresses")
        .update({
          name: address.name ?? null,
          phone: address.phone ?? null,
          line2: address.line2 ?? null,
          city: address.city ?? null,
          state: address.state ?? null,
          country: address.country ?? null,
        })
        .eq("id", existing.id);

      if (error) {
        throw error;
      }
    } else {
      // Insert new address
      const insert: UserAddressInsert = {
        user_id: userId,
        name: address.name ?? null,
        phone: address.phone ?? null,
        line1: address.line1 ?? null,
        line2: address.line2 ?? null,
        city: address.city ?? null,
        state: address.state ?? null,
        postal_code: address.postalCode ?? null,
        country: address.country ?? null,
      };

      const { error } = await this.supabase.from("user_addresses").insert(insert);

      if (error) {
        throw error;
      }
    }
  }

  async listUserAddresses(userId: string): Promise<UserAddressRow[]> {
    const { data, error } = await this.supabase
      .from("user_addresses")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }
    return data ?? [];
  }

  async deleteUserAddress(userId: string, addressId: string): Promise<void> {
    const { error } = await this.supabase
      .from("user_addresses")
      .delete()
      .eq("user_id", userId)
      .eq("id", addressId);

    if (error) {
      throw error;
    }
  }

  async getOrderShipping(orderId: string): Promise<OrderShippingRow | null> {
    const { data, error } = await this.supabase
      .from("order_shipping")
      .select("*")
      .eq("order_id", orderId)
      .maybeSingle();

    if (error) {
      throw error;
    }
    return data ?? null;
  }
}
