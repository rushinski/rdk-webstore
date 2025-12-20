// src/types/views/shipping.ts
import type { Tables, TablesInsert } from "@/types/database.types";

export type ShippingProfile = Tables<"shipping_profiles">;
export type ShippingProfileUpsert = TablesInsert<"shipping_profiles">;
