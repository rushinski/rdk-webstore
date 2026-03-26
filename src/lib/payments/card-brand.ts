export type CardBrandId =
  | "visa"
  | "mastercard"
  | "american-express"
  | "discover"
  | "unknown";

const CARD_BRAND_META: Record<
  Exclude<CardBrandId, "unknown">,
  { icon: string; label: string }
> = {
  visa: { icon: "visa", label: "Visa" },
  mastercard: { icon: "mastercard", label: "Mastercard" },
  "american-express": {
    icon: "american-express",
    label: "American Express",
  },
  discover: { icon: "discover", label: "Discover" },
};

const CARD_BRAND_ALIASES: Record<string, Exclude<CardBrandId, "unknown">> = {
  visa: "visa",
  mastercard: "mastercard",
  "master card": "mastercard",
  "master-card": "mastercard",
  mc: "mastercard",
  "american express": "american-express",
  amex: "american-express",
  discover: "discover",
};

function normalizeBrandKey(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function detectCardBrandFromDigits(value?: string | null): CardBrandId {
  const digits = value?.replace(/\D/g, "") ?? "";

  if (!digits) {
    return "unknown";
  }

  if (digits.startsWith("4")) {
    return "visa";
  }

  if (digits.startsWith("34") || digits.startsWith("37")) {
    return "american-express";
  }

  const first2 = Number(digits.slice(0, 2));
  const first3 = Number(digits.slice(0, 3));
  const first4 = Number(digits.slice(0, 4));

  if ((first2 >= 51 && first2 <= 55) || (first4 >= 2221 && first4 <= 2720)) {
    return "mastercard";
  }

  if (
    digits.startsWith("6011") ||
    digits.startsWith("65") ||
    (first3 >= 644 && first3 <= 649)
  ) {
    return "discover";
  }

  return "unknown";
}

export function resolveCardBrand(input: {
  cardType?: string | null;
  maskedCard?: string | null;
}): CardBrandId {
  const normalizedType = input.cardType ? normalizeBrandKey(input.cardType) : "";

  if (normalizedType && CARD_BRAND_ALIASES[normalizedType]) {
    return CARD_BRAND_ALIASES[normalizedType];
  }

  return detectCardBrandFromDigits(input.maskedCard);
}

export function getCardBrandIcon(brand: CardBrandId): string {
  return brand === "unknown" ? "default" : CARD_BRAND_META[brand].icon;
}

export function getCardBrandLabel(brand: CardBrandId): string | null {
  return brand === "unknown" ? null : CARD_BRAND_META[brand].label;
}

export function normalizeCardTypeLabel(value?: string | null): string | null {
  if (!value?.trim()) {
    return null;
  }

  const brand = resolveCardBrand({ cardType: value });
  if (brand === "unknown") {
    return value.trim();
  }

  return CARD_BRAND_META[brand].label;
}
