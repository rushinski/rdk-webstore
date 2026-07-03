"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

import { AdminSidebar } from "@/components/admin/AdminSidebar";
import type { ProfileRole } from "@/config/constants/roles";
import { StorefrontCartDrawer } from "@/components/storefront/cart/StorefrontCartDrawer";
import { StorefrontFooter } from "@/components/storefront/shell/StorefrontFooter";
import { StorefrontSearchOverlay } from "@/components/storefront/search/StorefrontSearchOverlay";

export function ClientShell({
  children,
  isAdmin = false,
  userEmail = null,
  role = null,
}: {
  children: React.ReactNode;
  isAdmin?: boolean;
  userEmail?: string | null;
  role?: ProfileRole | null;
}) {
  const pathname = usePathname();
  const [searchOpen, setSearchOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);

  useEffect(() => {
    const handleOpenSearch = () => setSearchOpen(true);
    const handleOpenCart = () => setCartOpen(true);

    window.addEventListener("openSearch", handleOpenSearch);
    window.addEventListener("openCart", handleOpenCart);

    return () => {
      window.removeEventListener("openSearch", handleOpenSearch);
      window.removeEventListener("openCart", handleOpenCart);
    };
  }, []);

  useEffect(() => {
    const isAdminRoute = pathname.startsWith("/admin");
    const isAuthRoute = pathname.startsWith("/auth");
    const routeValue = isAdminRoute ? "admin" : isAuthRoute ? "auth" : "store";
    document.body.dataset.route = routeValue;
  }, [pathname]);

  const isAdminRoute = pathname.startsWith("/admin");
  const isAuthRoute = pathname.startsWith("/auth");
  const isCheckoutRoute = pathname.startsWith("/checkout");
  const isStoreRoute = !isAdminRoute && !isAuthRoute && !isCheckoutRoute;
  const showAdminSidebar = isAdmin && isStoreRoute && Boolean(role);

  return (
    <>
      {showAdminSidebar && (
        <AdminSidebar userEmail={userEmail} role={role as ProfileRole} />
      )}
      <div className={showAdminSidebar ? "md:ml-64" : undefined}>{children}</div>

      <StorefrontSearchOverlay isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
      <StorefrontCartDrawer isOpen={cartOpen} onClose={() => setCartOpen(false)} />
      {isStoreRoute && <StorefrontFooter />}
    </>
  );
}
