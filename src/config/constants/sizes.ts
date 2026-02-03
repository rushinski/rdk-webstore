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
  "EU 35 (US 5.5W)",
  "EU 36 (US 6W)",
  "EU 36.5 (US 6.5W)",
  "EU 37 (US 7W)",
  "EU 37.5 (US 7.5W)",
  "EU 38 (US 8W)",
  "EU 38.5 (US 8.5W)",
  "EU 39 (US 7M)",
  "EU 39.5 (US 7M)",
  "EU 40 (US 7M)",
  "EU 40 (US 8M)",
  "EU 41 (US 8.5M)",
  "EU 42 (US 9M)",
  "EU 43 (US 10M)",
  "EU 44 (US 11M)",
  "EU 45 (US 12M)",
  "EU 46 (US 13M)",
  "EU 47 (US 14M)",
  "EU 48 (US 15M)",
  "EU 49 (US 16M)",
] as const;

const isUsMens = (size: string) => /^\d+(\.\d+)?M\b/.test(size);
const isYouth = (size: string) => /^\d+(\.\d+)?Y\b/.test(size);
const isEu = (size: string) => size.startsWith("EU");

const US_SIZE_TOKEN_REGEX = /\b\d+(?:\.\d+)?[MW]\b/g;
const EU_US_RANGE_REGEX = /\(US\s+([^)]+)\)/;

const normalizeUsToken = (raw: string, fallbackSuffix?: "M" | "W") => {
  const trimmed = raw.trim();
  const suffixMatch = trimmed.match(/[MW]$/);
  const suffix = (suffixMatch?.[0] as "M" | "W" | undefined) ?? fallbackSuffix;
  if (!suffix) {
    return trimmed;
  }
  const numeric = suffixMatch ? trimmed.slice(0, -1) : trimmed;
  return `${numeric}${suffix}`;
};

const extractUsTokensFromEu = (size: string) => {
  const match = size.match(EU_US_RANGE_REGEX);
  if (!match) {
    return [];
  }
  const rangeRaw = match[1].replace(/\s+/g, "");
  const parts = rangeRaw.split("-");
  if (parts.length === 1) {
    return [normalizeUsToken(parts[0])].filter(Boolean);
  }
  const secondSuffixMatch = parts[1].match(/[MW]$/);
  const suffix = secondSuffixMatch?.[0] as "M" | "W" | undefined;
  return [normalizeUsToken(parts[0], suffix), normalizeUsToken(parts[1], suffix)].filter(
    Boolean,
  );
};

const buildUsTokenMap = (sizes: readonly string[]) => {
  const tokenMap: Record<string, string[]> = {};
  sizes.forEach((size) => {
    if (isEu(size)) {
      return;
    }
    const tokens = size.match(US_SIZE_TOKEN_REGEX) ?? [];
    tokens.forEach((token) => {
      if (!tokenMap[token]) {
        tokenMap[token] = [];
      }
      if (!tokenMap[token].includes(size)) {
        tokenMap[token].push(size);
      }
    });
  });
  return tokenMap;
};

export const SHOE_SIZE_GROUPS = {
  youth: SHOE_SIZES.filter(isYouth),
  mens: SHOE_SIZES.filter(isUsMens), // ✅ only "7.5M / 9W", etc.
  eu: SHOE_SIZES.filter(isEu),
} as const;

export const CLOTHING_SIZES = [
  "XS",
  "SMALL",
  "MEDIUM",
  "LARGE",
  "XL",
  "2XL",
  "3XL",
] as const;

const US_TOKEN_TO_SIZES = buildUsTokenMap(SHOE_SIZES);

export const EU_SIZE_ALIASES = SHOE_SIZES.filter(isEu).reduce<Record<string, string[]>>(
  (acc, size) => {
    const tokens = extractUsTokensFromEu(size);
    const mapped = tokens.flatMap((token) => US_TOKEN_TO_SIZES[token] ?? []);
    acc[size] = Array.from(new Set(mapped));
    return acc;
  },
  {},
);

export const US_SIZE_EU_ALIASES = Object.entries(EU_SIZE_ALIASES).reduce<
  Record<string, string[]>
>((acc, [euSize, usSizes]) => {
  usSizes.forEach((usSize) => {
    if (!acc[usSize]) {
      acc[usSize] = [];
    }
    if (!acc[usSize].includes(euSize)) {
      acc[usSize].push(euSize);
    }
  });
  return acc;
}, {});

export const isEuShoeSize = (size: string) => isEu(size);

export const expandShoeSizeSelection = (sizes: string[]) => {
  const expanded: string[] = [];
  const seen = new Set<string>();
  const push = (value: string) => {
    if (!seen.has(value)) {
      seen.add(value);
      expanded.push(value);
    }
  };
  sizes.forEach((size) => {
    push(size);
    if (!isEu(size)) {
      (US_SIZE_EU_ALIASES[size] ?? []).forEach(push);
    }
  });
  return expanded;
};
