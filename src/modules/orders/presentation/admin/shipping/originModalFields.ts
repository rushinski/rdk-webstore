"use client";

import type { ShippingOrigin } from "@/types/domain/shipping";

export type OriginFieldKey = keyof ShippingOrigin;

export type OriginFieldDefinition = {
  field: OriginFieldKey;
  label: string;
  optional?: boolean;
};

export const ORIGIN_MODAL_FIELDS: OriginFieldDefinition[] = [
  { field: "name", label: "Contact name" },
  { field: "company", label: "Company" },
  { field: "phone", label: "Phone", optional: true },
  { field: "line1", label: "Line 1" },
  { field: "line2", label: "Line 2", optional: true },
  { field: "city", label: "City" },
  { field: "state", label: "State" },
  { field: "postal_code", label: "Postal Code" },
  { field: "country", label: "Country" },
];
