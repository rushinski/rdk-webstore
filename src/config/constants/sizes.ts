// src/config/constants/sizes.ts

export const SHOE_SIZES = [
  "3.5Y / 5W",
  "4Y / 5.5W",
  "4.5Y / 6W",
  "5Y / 6.5W",
  "5.5Y / 7W",
  "6Y / 7.5W",
  "6.5Y / 8W",
  "7Y / 8.5W",
  "7.5M / 9W",
  "8M / 9.5W",
  "8.5M / 10W",
  "9M / 10.5W",
  "9.5M / 11W",
  "10M / 11.5W",
  "10.5M / 12W",
  "11M / 12.5W",
  "11.5M / 13W",
  "12M / 13.5W",
  "12.5M / 14W",
  "13M / 14.5W",
  "13.5M / 15W",
  "14M / 15.5W",
  "15M / 16M",
  "EU 36 (US 5.5-6W)",
  "EU 37 (US 6.5-7W)",
  "EU 38 (US 7.5W)",
  "EU 39 (US 8-8.5W)",
  "EU 40 (US 9-9.5W)",
  "EU 41 (US 7.5-8M)",
  "EU 42 (US 8.5-9M)",
  "EU 43 (US 9.5-10M)",
  "EU 44 (US 10-10.5M)",
  "EU 45 (US 11.5-12M)",
  "EU 46 (US 12-12.5M)",
  "EU 47 (US 13M)",
  "EU 48 (US 14-15M)",
] as const;

const isUsMens = (size: string) => /^\d+(\.\d+)?M\b/.test(size);
const isYouth = (size: string) => /^\d+(\.\d+)?Y\b/.test(size);
const isEu = (size: string) => size.startsWith("EU");

export const SHOE_SIZE_GROUPS = {
  youth: SHOE_SIZES.filter(isYouth),
  mens: SHOE_SIZES.filter(isUsMens), // ✅ only "7.5M / 9W", etc.
  eu: SHOE_SIZES.filter(isEu),
} as const;

export const CLOTHING_SIZES = ["XS", "SMALL", "MEDIUM", "LARGE", "XL", "2XL", "3XL"] as const;
