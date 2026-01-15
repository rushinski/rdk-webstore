// src/components/cart/CartProvider.tsx (FIXED - handles new event structure)
"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  ReactNode,
} from "react";
import { CartService } from "@/services/cart-service";
import type { CartItem } from "@/types/domain/cart";

interface CartContextType {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "quantity">) => void;
  removeItem: (productId: string, variantId: string) => void;
  updateQuantity: (productId: string, variantId: string, quantity: number) => void;
  setCartItems: (items: CartItem[]) => void;
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
  const didInitialValidation = useRef(false);
  const isValidatingRef = useRef(false);

  const refreshCart = useCallback(async () => {
    const current = cart.getCart();
    if (current.length === 0 || isValidatingRef.current) return;
    isValidatingRef.current = true;

    try {
      const response = await fetch("/api/cart/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: current.map((item) => ({
            productId: item.productId,
            variantId: item.variantId,
            quantity: item.quantity,
          })),
        }),
      });

      const data = await response.json().catch(() => null);
      if (response.ok && Array.isArray(data?.items)) {
        cart.setCart(data.items as CartItem[]);
      }
    } catch {
      // ignore validation failures
    } finally {
      isValidatingRef.current = false;
    }
  }, [cart]);

  useEffect(() => {
    const storedItems = cart.getCart();
    setItems(storedItems);
    setIsReady(true);
    try {
      const count = storedItems.reduce((sum, item) => sum + item.quantity, 0);
      window.dispatchEvent(
        new CustomEvent("cartUpdated", { detail: { count, items: storedItems } }),
      );
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

    window.addEventListener("cartUpdated", handleCartUpdate);
    return () => window.removeEventListener("cartUpdated", handleCartUpdate);
  }, [cart]);

  useEffect(() => {
    if (didInitialValidation.current || !isReady) return;
    didInitialValidation.current = true;
    if (items.length > 0) {
      refreshCart();
    }
  }, [isReady, items.length, refreshCart]);

  useEffect(() => {
    const handleOpenCart = () => {
      refreshCart();
    };

    window.addEventListener("openCart", handleOpenCart);
    return () => window.removeEventListener("openCart", handleOpenCart);
  }, [refreshCart]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        refreshCart();
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [refreshCart]);

  const addItem = useCallback(
    (item: Omit<CartItem, "quantity">) => {
      cart.addItem(item);
    },
    [cart],
  );

  const removeItem = useCallback(
    (productId: string, variantId: string) => {
      cart.removeItem(productId, variantId);
    },
    [cart],
  );

  const updateQuantity = useCallback(
    (productId: string, variantId: string, quantity: number) => {
      cart.updateQuantity(productId, variantId, quantity);
    },
    [cart],
  );

  const setCartItems = useCallback(
    (nextItems: CartItem[]) => {
      cart.setCart(nextItems);
    },
    [cart],
  );

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
        setCartItems,
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
    throw new Error("useCart must be used within CartProvider");
  }
  return context;
}
