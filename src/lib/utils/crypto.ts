// src/lib/crypto.ts (NEW)

import crypto from "crypto";

export function generatePublicToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function generateOrderAccessToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}

export function hashString(data: string): string {
  return crypto.createHash("sha256").update(data).digest("hex");
}

export function hashToken(token: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(token).digest("hex");
}

type CartItemLike = {
  productId?: string | number | null;
  variantId?: string | number | null;
  quantity?: number | string | null;
};

export function createCartHash(items: CartItemLike[], fulfillment: string): string {
  const normalizedItems = (items ?? [])
    .map((item) => ({
      productId: String(item?.productId ?? ""),
      variantId: String(item?.variantId ?? ""),
      quantity: Number(item?.quantity ?? 0),
    }))
    .sort((a, b) => {
      const keyA = `${a.productId}:${a.variantId}`;
      const keyB = `${b.productId}:${b.variantId}`;
      if (keyA !== keyB) {
        return keyA.localeCompare(keyB);
      }
      return a.quantity - b.quantity;
    });

  const canonical = JSON.stringify({
    fulfillment: String(fulfillment ?? ""),
    items: normalizedItems,
  });

  return hashString(canonical);
}
