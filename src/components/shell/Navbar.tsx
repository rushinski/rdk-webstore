// src/components/shell/Navbar.tsx
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Search,
  ShoppingCart,
  User,
  X,
  ChevronDown,
  Menu,
  Home,
  Settings,
  LogOut,
  Shirt,
  Ruler,
  Tag,
  ShoppingBag,
  Watch,
  Laptop,
} from 'lucide-react';
import { SHOE_SIZES, CLOTHING_SIZES } from '@/config/constants/sizes';
import { BRANDS } from '@/config/constants/brands';

type ActiveMenu = 'shop' | 'brands' | 'shoeSizes' | 'clothingSizes' | null;

interface NavbarProps {
  isAuthenticated?: boolean;
  isAdmin?: boolean;
  userEmail?: string;
  cartCount?: number;
}

function buildStoreHref(params: Record<string, string>) {
  const sp = new URLSearchParams(params);
  return `/store?${sp.toString()}`;
}

function MenuShell({
  open,
  align = 'left',
  children,
}: {
  open: boolean;
  align?: 'left' | 'right';
  children: React.ReactNode;
}) {
  if (!open) return null;

  return (
    <div
      className={`absolute top-full ${align === 'left' ? 'left-0' : 'right-0'} pt-3 z-50`}
      role="menu"
    >
      <div className="min-w-[500px] max-w-[calc(100vw-2rem)] border border-zinc-800 bg-black shadow-2xl">
        {children}
      </div>
    </div>
  );
}

function MegaLink({
  href,
  icon,
  label,
  description,
  onClick,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  description: string;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="group flex gap-3 p-4 hover:bg-zinc-900 transition-colors border-b border-zinc-900 last:border-b-0 cursor-pointer"
    >
      <div className="flex h-10 w-10 items-center justify-center bg-zinc-900 group-hover:bg-red-600 transition-colors">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-white">{label}</div>
        <div className="text-xs text-zinc-500 truncate">{description}</div>
      </div>
    </Link>
  );
}

const SHOE_SIZE_GROUPS = {
  youth: SHOE_SIZES.filter(s => s.includes('Y')).slice(0, 7),
  mens: SHOE_SIZES.filter(s => s.includes('M') && !s.includes('Y')),
};

export function Navbar({ isAuthenticated = false, isAdmin = false, userEmail, cartCount = 0 }: NavbarProps) {
  const [activeMenu, setActiveMenu] = useState<ActiveMenu>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [mobileSection, setMobileSection] = useState<ActiveMenu>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const [localCartCount, setLocalCartCount] = useState(cartCount);

  useEffect(() => {
    const handleCartUpdate = (e: Event) => {
      const event = e as CustomEvent;
      setLocalCartCount(event.detail?.count ?? 0);
    };

    window.addEventListener('cartUpdated', handleCartUpdate);
    return () => window.removeEventListener('cartUpdated', handleCartUpdate);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/';
  };

  const handleSearchClick = () => window.dispatchEvent(new CustomEvent('openSearch'));
  const handleCartClick = () => window.dispatchEvent(new CustomEvent('openCart'));

  const shopItems = useMemo(
    () => [
      {
        href: '/store',
        icon: <ShoppingBag className="w-5 h-5 text-white" />,
        label: 'Shop All',
        description: 'Browse everything in stock',
      },
      {
        href: buildStoreHref({ category: 'sneakers' }),
        icon: <Tag className="w-5 h-5 text-white" />,
        label: 'Sneakers',
        description: 'Authentic pairs, ready to ship',
      },
      {
        href: buildStoreHref({ category: 'clothing' }),
        icon: <Shirt className="w-5 h-5 text-white" />,
        label: 'Clothing',
        description: 'Streetwear essentials & heat',
      },
      {
        href: buildStoreHref({ category: 'accessories' }),
        icon: <Watch className="w-5 h-5 text-white" />,
        label: 'Accessories',
        description: 'Add-ons, extras, rare finds',
      },
      {
        href: buildStoreHref({ category: 'electronics' }),
        icon: <Laptop className="w-5 h-5 text-white" />,
        label: 'Electronics',
        description: 'Tech & collectibles',
      },
    ],
    []
  );

  return (
    <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between h-16">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 relative flex-shrink-0">
              <Image src="/images/rdk-logo.png" alt="Real Deal Kickz" fill className="object-contain" />
            </div>
            <span className="text-white font-bold text-lg tracking-tight hidden sm:block">
              REALDEALKICKZSC
            </span>
          </Link>

          <div className="hidden lg:flex items-center gap-1">
            <div
              className="relative"
              onMouseEnter={() => setActiveMenu('shop')}
              onMouseLeave={() => setActiveMenu(null)}
            >
              <button
                type="button"
                className="flex items-center gap-1 px-3 py-2 text-gray-300 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
                onClick={() => setActiveMenu(activeMenu === 'shop' ? null : 'shop')}
              >
                <span className="text-sm">Shop</span>
                <ChevronDown className="w-3 h-3" />
              </button>

              <MenuShell open={activeMenu === 'shop'} align="left">
                <div className="p-6 border-b border-zinc-900">
                  <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">Shop Categories</h3>
                </div>
                <div>
                  {shopItems.map((it) => (
                    <MegaLink
                      key={it.label}
                      href={it.href}
                      icon={it.icon}
                      label={it.label}
                      description={it.description}
                      onClick={() => setActiveMenu(null)}
                    />
                  ))}
                </div>
              </MenuShell>
            </div>

            <div
              className="relative"
              onMouseEnter={() => setActiveMenu('brands')}
              onMouseLeave={() => setActiveMenu(null)}
            >
              <button
                type="button"
                className="flex items-center gap-1 px-3 py-2 text-gray-300 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
                onClick={() => setActiveMenu(activeMenu === 'brands' ? null : 'brands')}
              >
                <span className="text-sm">Brands</span>
                <ChevronDown className="w-3 h-3" />
              </button>

              <MenuShell open={activeMenu === 'brands'} align="left">
                <div className="p-6 border-b border-zinc-900">
                  <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">Shop by Brand</h3>
                  <p className="text-xs text-zinc-600">Premium sneaker & streetwear brands</p>
                </div>

                <div className="p-6">
                  <div className="grid grid-cols-2 gap-3">
                    {BRANDS.map((brand) => (
                      <Link
                        key={brand}
                        href={buildStoreHref({ brand })}
                        onClick={() => setActiveMenu(null)}
                        className="px-4 py-3 text-sm font-semibold text-white bg-zinc-900 hover:bg-red-600 transition-colors border border-zinc-800 hover:border-red-600 cursor-pointer"
                      >
                        {brand}
                      </Link>
                    ))}
                  </div>
                </div>
              </MenuShell>
            </div>

            <div
              className="relative"
              onMouseEnter={() => setActiveMenu('shoeSizes')}
              onMouseLeave={() => setActiveMenu(null)}
            >
              <button
                type="button"
                className="flex items-center gap-1 px-3 py-2 text-gray-300 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
                onClick={() => setActiveMenu(activeMenu === 'shoeSizes' ? null : 'shoeSizes')}
              >
                <span className="text-sm">Sneaker Sizes</span>
                <ChevronDown className="w-3 h-3" />
              </button>

              <MenuShell open={activeMenu === 'shoeSizes'} align="left">
                <div className="p-6 border-b border-zinc-900">
                  <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">Find Your Size</h3>
                  <p className="text-xs text-zinc-600">Men's, Women's & Youth sizes available</p>
                </div>

                <div className="p-6 space-y-6 max-h-[400px] overflow-y-auto custom-scrollbar">
                  <div>
                    <div className="text-xs font-bold text-zinc-600 uppercase tracking-wider mb-3">Youth</div>
                    <div className="grid grid-cols-4 gap-2">
                      {SHOE_SIZE_GROUPS.youth.map((size) => (
                        <Link
                          key={size}
                          href={buildStoreHref({ category: 'sneakers', sizeShoe: size })}
                          onClick={() => setActiveMenu(null)}
                          className="px-3 py-2 text-center text-xs font-semibold text-white bg-zinc-900 hover:bg-red-600 transition-colors border border-zinc-800 hover:border-red-600 cursor-pointer"
                        >
                          {size}
                        </Link>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs font-bold text-zinc-600 uppercase tracking-wider mb-3">Men's</div>
                    <div className="grid grid-cols-4 gap-2">
                      {SHOE_SIZE_GROUPS.mens.map((size) => (
                        <Link
                          key={size}
                          href={buildStoreHref({ category: 'sneakers', sizeShoe: size })}
                          onClick={() => setActiveMenu(null)}
                          className="px-3 py-2 text-center text-xs font-semibold text-white bg-zinc-900 hover:bg-red-600 transition-colors border border-zinc-800 hover:border-red-600 cursor-pointer"
                        >
                          {size}
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              </MenuShell>
            </div>

            <div
              className="relative"
              onMouseEnter={() => setActiveMenu('clothingSizes')}
              onMouseLeave={() => setActiveMenu(null)}
            >
              <button
                type="button"
                className="flex items-center gap-1 px-3 py-2 text-gray-300 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
                onClick={() => setActiveMenu(activeMenu === 'clothingSizes' ? null : 'clothingSizes')}
              >
                <span className="text-sm">Clothing Sizes</span>
                <ChevronDown className="w-3 h-3" />
              </button>

              <MenuShell open={activeMenu === 'clothingSizes'} align="left">
                <div className="p-6 border-b border-zinc-900">
                  <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">Clothing Sizes</h3>
                  <p className="text-xs text-zinc-600">Filter streetwear by your perfect fit</p>
                </div>

                <div className="p-6">
                  <div className="grid grid-cols-4 gap-3">
                    {CLOTHING_SIZES.map((size) => (
                      <Link
                        key={size}
                        href={buildStoreHref({ category: 'clothing', sizeClothing: size })}
                        onClick={() => setActiveMenu(null)}
                        className="px-4 py-3 text-center text-sm font-bold text-white bg-zinc-900 hover:bg-red-600 transition-colors border border-zinc-800 hover:border-red-600 cursor-pointer"
                      >
                        {size}
                      </Link>
                    ))}
                  </div>
                </div>
              </MenuShell>
            </div>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-4">
          <Link href="/" className="text-gray-300 hover:text-white transition-colors cursor-pointer" aria-label="Home">
            <Home className="w-5 h-5" />
          </Link>

          <button onClick={handleSearchClick} className="text-gray-300 hover:text-white transition-colors cursor-pointer" aria-label="Search">
            <Search className="w-5 h-5" />
          </button>

          <button
            onClick={handleCartClick}
            className="relative text-gray-300 hover:text-white transition-colors cursor-pointer"
            aria-label="Cart"
          >
            <ShoppingCart className="w-5 h-5" />
            {localCartCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full">
                {localCartCount}
              </span>
            )}
          </button>

          {isAuthenticated ? (
            <div ref={profileRef} className="relative">
              <button
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center space-x-2 text-gray-300 hover:text-white transition-colors cursor-pointer"
              >
                <User className="w-5 h-5" />
                <ChevronDown className="w-3 h-3" />
              </button>

              {isProfileOpen && (
                <div className="absolute top-full right-0 mt-3 w-56 border border-zinc-800 bg-black shadow-2xl z-50">
                  {userEmail && (
                    <div className="px-4 py-3 border-b border-zinc-900">
                      <p className="text-xs text-zinc-500 truncate">{userEmail}</p>
                    </div>
                  )}

                  <Link
                    href="/account"
                    onClick={() => setIsProfileOpen(false)}
                    className="flex items-center gap-2 px-4 py-3 text-gray-300 hover:bg-zinc-900 hover:text-white text-sm transition-colors cursor-pointer"
                  >
                    <Settings className="w-4 h-4" />
                    Account Settings
                  </Link>

                  {isAdmin && (
                    <Link
                      href="/admin"
                      onClick={() => setIsProfileOpen(false)}
                      className="flex items-center gap-2 px-4 py-3 text-gray-300 hover:bg-zinc-900 hover:text-white text-sm transition-colors cursor-pointer"
                    >
                      <Settings className="w-4 h-4" />
                      Admin Dashboard
                    </Link>
                  )}

                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 w-full text-left px-4 py-3 text-gray-300 hover:bg-zinc-900 hover:text-white text-sm border-t border-zinc-900 transition-colors cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/auth/login" className="px-4 py-2 text-sm font-semibold text-gray-300 hover:text-white transition-colors cursor-pointer">
                Login
              </Link>
              <Link href="/auth/register" className="px-4 py-2 text-sm font-bold bg-red-600 hover:bg-red-700 text-white transition-colors cursor-pointer rounded">
                Sign Up
              </Link>
            </div>
          )}
        </div>

        <button onClick={() => setIsMobileMenuOpen(true)} className="md:hidden text-gray-300 cursor-pointer" aria-label="Open menu">
          <Menu className="w-6 h-6" />
        </button>
      </div>

      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-black">
          <div className="p-6">
            <div className="flex items-center justify-between mb-8">
              <span className="text-white font-bold text-lg">Menu</span>
              <button onClick={() => setIsMobileMenuOpen(false)} className="text-gray-400 hover:text-white cursor-pointer" aria-label="Close menu">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-2">
              <Link
                href="/store"
                onClick={() => setIsMobileMenuOpen(false)}
                className="block px-4 py-3 text-gray-200 bg-zinc-900 hover:bg-red-600 transition-colors border border-zinc-800 cursor-pointer"
              >
                Shop All
              </Link>

              <button
                className="w-full flex items-center justify-between px-4 py-3 text-gray-200 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 transition-colors cursor-pointer"
                onClick={() => setMobileSection(mobileSection === 'shop' ? null : 'shop')}
              >
                <span className="flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4" />
                  Categories
                </span>
                <ChevronDown className={`w-4 h-4 transition-transform ${mobileSection === 'shop' ? 'rotate-180' : ''}`} />
              </button>
              {mobileSection === 'shop' && (
                <div className="space-y-2 pl-2">
                  {shopItems.map((it) => (
                    <Link
                      key={it.label}
                      href={it.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="block px-4 py-3 text-gray-300 hover:text-white hover:bg-zinc-900 transition-colors border-l-2 border-zinc-800 hover:border-red-600 cursor-pointer"
                    >
                      {it.label}
                    </Link>
                  ))}
                </div>
              )}

              <button
                className="w-full flex items-center justify-between px-4 py-3 text-gray-200 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 transition-colors cursor-pointer"
                onClick={() => setMobileSection(mobileSection === 'brands' ? null : 'brands')}
              >
                <span className="flex items-center gap-2">
                  <Tag className="w-4 h-4" />
                  Brands
                </span>
                <ChevronDown className={`w-4 h-4 transition-transform ${mobileSection === 'brands' ? 'rotate-180' : ''}`} />
              </button>
              {mobileSection === 'brands' && (
                <div className="grid grid-cols-2 gap-2 pl-2">
                  {BRANDS.map((brand) => (
                    <Link
                      key={brand}
                      href={buildStoreHref({ brand })}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="px-4 py-3 text-sm text-gray-300 hover:text-white bg-zinc-900 hover:bg-red-600 transition-colors border border-zinc-800 cursor-pointer"
                    >
                      {brand}
                    </Link>
                  ))}
                </div>
              )}

              <button
                className="w-full flex items-center justify-between px-4 py-3 text-gray-200 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 transition-colors cursor-pointer"
                onClick={() => setMobileSection(mobileSection === 'shoeSizes' ? null : 'shoeSizes')}
              >
                <span className="flex items-center gap-2">
                  <Ruler className="w-4 h-4" />
                  Sneaker Sizes
                </span>
                <ChevronDown className={`w-4 h-4 transition-transform ${mobileSection === 'shoeSizes' ? 'rotate-180' : ''}`} />
              </button>
              {mobileSection === 'shoeSizes' && (
                <div className="grid grid-cols-3 gap-2 pl-2 max-h-64 overflow-auto">
                  {SHOE_SIZES.map((size) => (
                    <Link
                      key={size}
                      href={buildStoreHref({ category: 'sneakers', sizeShoe: size })}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="px-3 py-2 text-center text-xs text-gray-300 hover:text-white bg-zinc-900 hover:bg-red-600 transition-colors border border-zinc-800 cursor-pointer"
                    >
                      {size}
                    </Link>
                  ))}
                </div>
              )}

              <button
                className="w-full flex items-center justify-between px-4 py-3 text-gray-200 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 transition-colors cursor-pointer"
                onClick={() => setMobileSection(mobileSection === 'clothingSizes' ? null : 'clothingSizes')}
              >
                <span className="flex items-center gap-2">
                  <Shirt className="w-4 h-4" />
                  Clothing Sizes
                </span>
                <ChevronDown className={`w-4 h-4 transition-transform ${mobileSection === 'clothingSizes' ? 'rotate-180' : ''}`} />
              </button>
              {mobileSection === 'clothingSizes' && (
                <div className="grid grid-cols-3 gap-2 pl-2">
                  {CLOTHING_SIZES.map((size) => (
                    <Link
                      key={size}
                      href={buildStoreHref({ category: 'clothing', sizeClothing: size })}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="px-3 py-3 text-center text-xs text-gray-300 hover:text-white bg-zinc-900 hover:bg-red-600 transition-colors border border-zinc-800 cursor-pointer"
                    >
                      {size}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}