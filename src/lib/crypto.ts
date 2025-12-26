// src/lib/crypto.ts (NEW)

import crypto from "crypto";

export function generatePublicToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function hashString(data: string): string {
  return crypto.createHash("sha256").update(data).digest("hex");
}

export function createCartHash(items: any[], fulfillment: string): string {
  const canonical = JSON.stringify({ items, fulfillment }, Object.keys({ items, fulfillment }).sort());
  return hashString(canonical);
}