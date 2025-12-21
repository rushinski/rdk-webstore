// src/components/shell/ClientShell.tsx
'use client';

import { useState, useEffect } from 'react';
import { SearchOverlay } from '@/components/search/SearchOverlay';
import { CartDrawer } from '@/components/cart/CartDrawer';

export function ClientShell({ children }: { children: React.ReactNode }) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);

  useEffect(() => {
    const handleOpenSearch = () => setSearchOpen(true);
    const handleOpenCart = () => setCartOpen(true);

    window.addEventListener('openSearch', handleOpenSearch);
    window.addEventListener('openCart', handleOpenCart);

    return () => {
      window.removeEventListener('openSearch', handleOpenSearch);
      window.removeEventListener('openCart', handleOpenCart);
    };
  }, []);

  return (
    <>
      {children}
      <SearchOverlay isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
      <CartDrawer isOpen={cartOpen} onClose={() => setCartOpen(false)} />
    </>
  );
}