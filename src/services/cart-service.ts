// src/services/cart-service.ts (FIXED - dispatches count for navbar)
'use client';

import type { CartItem } from "@/types/views/cart";

const CART_KEY = 'rdk_cart';

export class CartService {
  getCart(): CartItem[] {
    if (typeof window === 'undefined') return [];
    const stored = localStorage.getItem(CART_KEY);
    return stored ? JSON.parse(stored) : [];
  }

  addItem(item: Omit<CartItem, 'quantity'>) {
    const cart = this.getCart();
    const existing = cart.find(
      i => i.productId === item.productId && i.variantId === item.variantId
    );
    const incomingMax = typeof item.maxStock === 'number' ? item.maxStock : undefined;

    if (incomingMax !== undefined && incomingMax <= 0) {
      return cart;
    }

    if (existing) {
      if (incomingMax !== undefined) {
        existing.maxStock = incomingMax;
      }
      const maxStock = existing.maxStock ?? incomingMax;
      if (typeof maxStock === 'number') {
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
      i => !(i.productId === productId && i.variantId === variantId)
    );
    this.saveCart(cart);
    return cart;
  }

  updateQuantity(productId: string, variantId: string, quantity: number) {
    const cart = this.getCart();
    const item = cart.find(
      i => i.productId === productId && i.variantId === variantId
    );

    if (item) {
      if (typeof item.maxStock === 'number') {
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
    return this.getCart().reduce(
      (sum, item) => sum + (item.priceCents * item.quantity),
      0
    );
  }

  private saveCart(cart: CartItem[]) {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    
    // Dispatch custom event with count for navbar
    const count = cart.reduce((sum, item) => sum + item.quantity, 0);
    window.dispatchEvent(new CustomEvent('cartUpdated', { 
      detail: { count, items: cart } 
    }));
  }
}
