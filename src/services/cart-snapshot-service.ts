// src/services/cart-snapshot-service.ts
"use client";

import type { CartItem } from "@/types/domain/cart";

export class CartSnapshotService {
  async backupCart(items: CartItem[]) {
    if (items.length === 0) {
      return;
    }
    await fetch("/api/cart/snapshot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    });
  }

  async restoreCart(): Promise<CartItem[] | null> {
    const response = await fetch("/api/cart/restore", {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }
    const data = await response.json().catch(() => null);
    if (!data || !Array.isArray(data.items) || data.items.length === 0) {
      return null;
    }
    return data.items as CartItem[];
  }
}
