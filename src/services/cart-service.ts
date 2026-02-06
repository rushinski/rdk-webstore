// src/services/cart-service.ts
"use client";

import type { CartItem } from "@/types/domain/cart";

const CART_KEY_LEGACY = "rdk_cart";
const CART_KEY_GUEST = "rdk_cart_session";
const CART_KEY_USER_PREFIX = "rdk_cart_user_";

type CartStorageScope =
  | { storage: Storage; key: string; kind: "guest" | "user" }
  | { storage: null; key: null; kind: "none" };

export class CartService {
  private userId: string | null;

  constructor(userId: string | null = null) {
    this.userId = userId;
  }

  setUserId(userId: string | null) {
    this.userId = userId;
  }

  getCart(): CartItem[] {
    const scope = this.resolveStorage();
    if (!scope.storage || !scope.key) {
      return [];
    }
    try {
      if (scope.kind === "user") {
        this.migrateLegacyCart(scope.key);
      }
      const stored = scope.storage.getItem(scope.key);
      if (!stored) {
        return [];
      }
      const parsed = JSON.parse(stored) as unknown;
      return Array.isArray(parsed) ? (parsed as CartItem[]) : [];
    } catch {
      return [];
    }
  }

  addItem(item: Omit<CartItem, "quantity">) {
    const cart = this.getCart();
    const existing = cart.find(
      (i) => i.productId === item.productId && i.variantId === item.variantId,
    );
    const incomingMax = typeof item.maxStock === "number" ? item.maxStock : undefined;

    if (incomingMax !== undefined && incomingMax <= 0) {
      return cart;
    }

    if (existing) {
      if (incomingMax !== undefined) {
        existing.maxStock = incomingMax;
      }
      const maxStock = existing.maxStock ?? incomingMax;
      if (typeof maxStock === "number") {
        existing.quantity = Math.min(existing.quantity + 1, maxStock);
      } else {
        existing.quantity += 1;
      }
    } else {
      cart.push({ ...item, quantity: 1, maxStock: incomingMax });
    }

    this.saveCart(cart);
    return cart;
  }

  removeItem(productId: string, variantId: string) {
    const cart = this.getCart().filter(
      (i) => !(i.productId === productId && i.variantId === variantId),
    );
    this.saveCart(cart);
    return cart;
  }

  updateQuantity(productId: string, variantId: string, quantity: number) {
    const cart = this.getCart();
    const item = cart.find((i) => i.productId === productId && i.variantId === variantId);

    if (item) {
      if (typeof item.maxStock === "number") {
        quantity = Math.min(quantity, item.maxStock);
      }
      if (quantity <= 0) {
        return this.removeItem(productId, variantId);
      }
      item.quantity = quantity;
      this.saveCart(cart);
    }

    return cart;
  }

  clearCart() {
    this.saveCart([]);
    return [];
  }

  setCart(items: CartItem[]) {
    this.saveCart(items);
    return items;
  }

  getItemCount(): number {
    return this.getCart().reduce((sum, item) => sum + item.quantity, 0);
  }

  getTotal(): number {
    return this.getCart().reduce((sum, item) => sum + item.priceCents * item.quantity, 0);
  }

  private saveCart(cart: CartItem[]) {
    const scope = this.resolveStorage();
    if (!scope.storage || !scope.key) {
      return;
    }
    try {
      scope.storage.setItem(scope.key, JSON.stringify(cart));
    } catch {
      // ignore storage errors
    }

    try {
      // Dispatch custom event with count for navbar
      const count = cart.reduce((sum, item) => sum + item.quantity, 0);
      window.dispatchEvent(
        new CustomEvent("cartUpdated", {
          detail: { count, items: cart },
        }),
      );
    } catch {
      // ignore event errors
    }
  }

  private resolveStorage(): CartStorageScope {
    if (typeof window === "undefined") {
      return { storage: null, key: null, kind: "none" };
    }

    if (this.userId) {
      return {
        storage: localStorage,
        key: `${CART_KEY_USER_PREFIX}${this.userId}`,
        kind: "user",
      };
    }

    return { storage: sessionStorage, key: CART_KEY_GUEST, kind: "guest" };
  }

  private migrateLegacyCart(targetKey: string) {
    try {
      const legacy = localStorage.getItem(CART_KEY_LEGACY);
      if (!legacy) {
        return;
      }
      const existing = localStorage.getItem(targetKey);
      if (!existing) {
        localStorage.setItem(targetKey, legacy);
      }
      localStorage.removeItem(CART_KEY_LEGACY);
    } catch {
      // ignore migration errors
    }
  }
}
