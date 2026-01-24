// src/components/shell/ClientShell.tsx
"use client";

import { useState, useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

import { SearchOverlay } from "@/components/search/SearchOverlay";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { ChatDrawer } from "@/components/chat/ChatDrawer";
import { ChatLauncher } from "@/components/chat/ChatLauncher";
import { Footer } from "@/components/shell/Footer";
import { MobileBottomNav } from "@/components/shell/MobileBottomNav";
import type { ProfileRole } from "@/config/constants/roles";

export function ClientShell({
  children,
}: {
  children: React.ReactNode;
  isAdmin?: boolean;
  userEmail?: string | null;
  role?: ProfileRole | null;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [searchOpen, setSearchOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

  useEffect(() => {
    const handleOpenSearch = () => setSearchOpen(true);
    const handleOpenCart = () => setCartOpen(true);
    const handleOpenChat = () => setChatOpen(true);

    window.addEventListener("openSearch", handleOpenSearch);
    window.addEventListener("openCart", handleOpenCart);
    window.addEventListener("openChat", handleOpenChat);

    return () => {
      window.removeEventListener("openSearch", handleOpenSearch);
      window.removeEventListener("openCart", handleOpenCart);
      window.removeEventListener("openChat", handleOpenChat);
    };
  }, []);

  useEffect(() => {
    const isAdminRoute = pathname.startsWith("/admin");
    const isAuthRoute = pathname.startsWith("/auth");
    const routeValue = isAdminRoute ? "admin" : isAuthRoute ? "auth" : "store";
    document.body.dataset.route = routeValue;
  }, [pathname]);

  useEffect(() => {
    if (!searchParams) {
      return;
    }
    const shouldOpenChat = searchParams.get("chat") === "1";
    if (shouldOpenChat) {
      setChatOpen(true);
    }
  }, [searchParams]);

  const isAdminRoute = pathname.startsWith("/admin");
  const isAuthRoute = pathname.startsWith("/auth");
  const isCheckoutRoute = pathname.startsWith("/checkout");
  const isStoreRoute = !isAdminRoute && !isAuthRoute && !isCheckoutRoute;

  useEffect(() => {
    if (!pathname) {
      return;
    }
    if (pathname.startsWith("/admin") || pathname.startsWith("/auth")) {
      return;
    }

    const visitorKey = "rdk_visitor_id";
    const sessionKey = "rdk_session_id";

    const getOrCreateId = (storage: Storage, key: string) => {
      const existing = storage.getItem(key);
      if (existing) {
        return existing;
      }
      const nextId =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      storage.setItem(key, nextId);
      return nextId;
    };

    const visitorId = getOrCreateId(localStorage, visitorKey);
    const sessionId = getOrCreateId(sessionStorage, sessionKey);
    const path = `${window.location.pathname}${window.location.search}`;

    const payload = JSON.stringify({
      path,
      referrer: document.referrer || null,
      visitorId,
      sessionId,
    });

    if (navigator.sendBeacon) {
      const blob = new Blob([payload], { type: "application/json" });
      navigator.sendBeacon("/api/analytics/track", blob);
    } else {
      fetch("/api/analytics/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
        keepalive: true,
      }).catch(() => undefined);
    }
  }, [pathname, searchParams]);

  return (
    <>
      <div>{children}</div>

      <SearchOverlay isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
      <CartDrawer isOpen={cartOpen} onClose={() => setCartOpen(false)} />
      {isStoreRoute && <ChatLauncher />}
      {isStoreRoute && (
        <ChatDrawer isOpen={chatOpen} onClose={() => setChatOpen(false)} />
      )}
      {isStoreRoute && <Footer />}
      {isStoreRoute && <MobileBottomNav />}
    </>
  );
}
