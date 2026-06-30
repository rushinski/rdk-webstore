"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, Search, ShoppingBag, User } from "lucide-react";

import type { ProfileRole } from "@/config/constants/roles";

import { StorefrontSidebarDrawer } from "./StorefrontSidebarDrawer";

export function StorefrontHeaderClient({
  children,
  isAuthenticated,
  cartCount,
}: {
  children: React.ReactNode;
  isAuthenticated: boolean;
  userEmail?: string | null;
  role?: ProfileRole | null;
  cartCount: number;
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    if (!drawerOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [drawerOpen]);

  return (
    <>
      <div className="flex min-w-0 flex-1 items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="flex h-11 w-11 items-center justify-center text-brand-text"
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <Link href="/" className="absolute left-1/2 -translate-x-1/2">
          {children}
        </Link>

        <div className="ml-auto hidden items-center gap-6 md:flex">
          <Link
            href={isAuthenticated ? "/account" : "/auth/login"}
            className="text-[13px] font-medium uppercase tracking-[0.06em] text-brand-text"
          >
            {isAuthenticated ? "ACCOUNT" : "LOGIN"}
          </Link>
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent("openSearch"))}
            className="text-[13px] font-medium uppercase tracking-[0.06em] text-brand-text"
          >
            SEARCH
          </button>
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent("openCart"))}
            className="text-[13px] font-medium uppercase tracking-[0.06em] text-brand-text"
          >
            CART ({cartCount})
          </button>
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent("openSearch"))}
            className="flex h-11 w-11 items-center justify-center text-brand-text"
            aria-label="Open search"
          >
            <Search className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent("openCart"))}
            className="relative flex h-11 w-11 items-center justify-center text-brand-text"
            aria-label="Open cart"
          >
            <ShoppingBag className="h-5 w-5" />
            {cartCount > 0 ? (
              <span className="absolute right-1 top-1 text-[10px] font-semibold">
                {cartCount}
              </span>
            ) : null}
          </button>
          <Link
            href={isAuthenticated ? "/account" : "/auth/login"}
            className="flex h-11 w-11 items-center justify-center text-brand-text"
            aria-label={isAuthenticated ? "Account" : "Login"}
          >
            <User className="h-5 w-5" />
          </Link>
        </div>
      </div>

      <StorefrontSidebarDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  );
}
