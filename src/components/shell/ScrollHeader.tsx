'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Navbar } from './Navbar';

export function ScrollHeader() {
  const pathname = usePathname();
  const isAuthRoute = pathname.startsWith('/auth');

  // ✅ Hooks must be unconditional
  const [isVisible, setIsVisible] = useState(true);
  const lastScrollYRef = useRef(0);

  useEffect(() => {
    // If auth route, don't attach listeners and keep it visible state reset
    if (isAuthRoute) {
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
  }, [isAuthRoute]);

  if (isAuthRoute) return null;

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 bg-black border-b border-red-900/20 transition-transform duration-300 ${
        isVisible ? 'translate-y-0' : '-translate-y-full'
      }`}
    >
      <Navbar />
    </header>
  );
}
