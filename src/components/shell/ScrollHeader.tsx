'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useCart } from '@/components/cart/CartProvider';
import { Navbar } from './Navbar';

interface ScrollHeaderProps {
  isAuthenticated?: boolean;
  userEmail?: string;
}

export function ScrollHeader({ isAuthenticated = false, userEmail }: ScrollHeaderProps) {
  const pathname = usePathname();
  const { itemCount } = useCart();
  const isAuthRoute = pathname.startsWith('/auth');
  const isAdminRoute = pathname.startsWith('/admin');
  const isCheckoutRoute = pathname.startsWith('/checkout');
  const hideHeader = isAuthRoute || isAdminRoute || isCheckoutRoute;

  // ✅ Hooks must be unconditional
  const [isVisible, setIsVisible] = useState(true);
  const lastScrollYRef = useRef(0);
  const headerRef = useRef<HTMLElement | null>(null);

  const updateHeaderOffset = useCallback(() => {
    const headerHeight = headerRef.current?.offsetHeight ?? 0;
    const baseGap = 0;
    const offset = isVisible ? headerHeight + baseGap : baseGap;
    document.documentElement.style.setProperty("--rdk-header-offset", `${offset}px`);
  }, [isVisible]);

  useEffect(() => {
    // If auth route, don't attach listeners and keep it visible state reset
    if (hideHeader) {
      setIsVisible(true);
      lastScrollYRef.current = 0;
      return;
    }

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const last = lastScrollYRef.current;

      if (currentScrollY < 10) setIsVisible(true);
      else if (currentScrollY > last) setIsVisible(false);
      else setIsVisible(true);

      lastScrollYRef.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [hideHeader]);

  useEffect(() => {
    updateHeaderOffset();
    window.addEventListener("resize", updateHeaderOffset);
    return () => window.removeEventListener("resize", updateHeaderOffset);
  }, [updateHeaderOffset]);

  if (hideHeader) return null;

  return (
    <header
      ref={headerRef}
      className={`fixed top-0 left-0 right-0 z-50 bg-black border-b border-zinc-800/70 transition-transform duration-300 ${
        isVisible ? 'translate-y-0' : '-translate-y-full'
      }`}
    >
      <Navbar isAuthenticated={isAuthenticated} userEmail={userEmail} cartCount={itemCount} />
    </header>
  );
}
