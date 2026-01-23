// src/components/shell/MobileBottomNav.tsx
"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Home, Search, ShoppingCart, User } from "lucide-react";

import { CartService } from "@/services/cart-service";

export function MobileBottomNav() {
  const pathname = usePathname();
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    const cart = new CartService();
    setCartCount(cart.getItemCount());

    const handleCartUpdate = () => {
      setCartCount(cart.getItemCount());
    };

    window.addEventListener("cartUpdated", handleCartUpdate);
    return () => window.removeEventListener("cartUpdated", handleCartUpdate);
  }, []);

  if (pathname.startsWith("/admin")) {
    return null;
  }

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-black border-t border-zinc-800/70 z-40 safe-area-bottom">
      <div className="flex items-center justify-around h-16 px-4">
        <Link
          href="/"
          className="flex flex-col items-center text-gray-300 hover:text-white"
        >
          <Home className="w-5 h-5" />
          <span className="text-xs mt-1">Home</span>
        </Link>

        <button
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent("openSearch"))}
          className="flex flex-col items-center text-gray-300 hover:text-white"
        >
          <Search className="w-5 h-5" />
          <span className="text-xs mt-1">Search</span>
        </button>

        <button
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent("openCart"))}
          className="relative flex flex-col items-center text-gray-300 hover:text-white"
        >
          <ShoppingCart className="w-5 h-5" />
          {cartCount > 0 && (
            <span className="absolute -top-2 -right-1 text-[10px] font-semibold text-red-500">
              {cartCount}
            </span>
          )}
          <span className="text-xs mt-1">Cart</span>
        </button>

        <Link
          href="/account"
          className="flex flex-col items-center text-gray-300 hover:text-white"
        >
          <User className="w-5 h-5" />
          <span className="text-xs mt-1">Account</span>
        </Link>
      </div>
    </nav>
  );
}
