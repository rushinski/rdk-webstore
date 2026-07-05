"use client";

export const TAX_CATEGORIES = [
  { key: "sneakers", label: "Sneakers" },
  { key: "clothing", label: "Clothing" },
  { key: "accessories", label: "Accessories" },
  { key: "electronics", label: "Electronics" },
] as const;

export type TaxCategoryKey = (typeof TAX_CATEGORIES)[number]["key"];

export type TaxSettingsResponse = {
  settings?: {
    taxEnabled?: boolean;
    taxCodeOverrides?: Record<string, string>;
  };
};

export const normalizeTaxCode = (value: string) => value.trim();
