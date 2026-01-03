// src/components/cart/CartProvider.tsx (FIXED - handles new event structure)
'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { CartService } from '@/services/cart-service';
import type { CartItem } from "@/types/views/cart";

interface CartContextType {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'quantity'>) => void;
  removeItem: (productId: string, variantId: string) => void;
  updateQuantity: (productId: string, variantId: string, quantity: number) => void;
  clearCart: () => void;
  itemCount: number;
  total: number;
  isReady: boolean;
}

const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart] = useState(() => new CartService());
  const [items, setItems] = useState<CartItem[]>([]);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const storedItems = cart.getCart();
    setItems(storedItems);
    setIsReady(true);
    try {
      const count = storedItems.reduce((sum, item) => sum + item.quantity, 0);
      window.dispatchEvent(new CustomEvent('cartUpdated', { detail: { count, items: storedItems } }));
    } catch {
      // ignore storage/event errors
    }

    const handleCartUpdate = (event: Event) => {
      const customEvent = event as CustomEvent<{ count: number; items: CartItem[] }>;
      // Update items from the event detail
      if (customEvent.detail?.items) {
        setItems(customEvent.detail.items);
      }
    };

    window.addEventListener('cartUpdated', handleCartUpdate);
    return () => window.removeEventListener('cartUpdated', handleCartUpdate);
  }, [cart]);

  const addItem = useCallback((item: Omit<CartItem, 'quantity'>) => {
    cart.addItem(item);
  }, [cart]);

  const removeItem = useCallback((productId: string, variantId: string) => {
    cart.removeItem(productId, variantId);
  }, [cart]);

  const updateQuantity = useCallback((productId: string, variantId: string, quantity: number) => {
    cart.updateQuantity(productId, variantId, quantity);
  }, [cart]);

  const clearCart = useCallback(() => {
    cart.clearCart();
  }, [cart]);

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const total = items.reduce((sum, item) => sum + item.priceCents * item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        itemCount,
        total,
        isReady,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within CartProvider');
  }
  return context;
}
