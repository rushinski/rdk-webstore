// src/components/shell/Navbar.tsx
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { usePathname } from 'next/navigation';
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
  ArrowLeft,
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
import { logError } from '@/lib/log';

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
  align = 'left',
  children,
}: {
  align?: 'left' | 'right';
  children: React.ReactNode;
}) {
  return (
    <div
      className={`absolute top-full ${
        align === 'left' ? 'left-0' : 'right-0'
      } pt-3 z-50 opacity-0 pointer-events-none translate-y-2 transition duration-150 group-hover:opacity-100 group-hover:pointer-events-auto group-hover:translate-y-0 group-focus-within:opacity-100 group-focus-within:pointer-events-auto group-focus-within:translate-y-0`}
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
  youth: SHOE_SIZES.filter((s) => s.includes('Y')).slice(0, 7),
  mens: SHOE_SIZES.filter((s) => s.includes('M') && !s.includes('Y')),
};

export function Navbar({
  isAuthenticated = false,
  isAdmin = false,
  userEmail,
  cartCount = 0,
}: NavbarProps) {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [mobileSection, setMobileSection] = useState<ActiveMenu>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const [localCartCount, setLocalCartCount] = useState(cartCount);
  const [brandGroups, setBrandGroups] = useState<Array<{ key: string; label: string }>>([]);
  const [designerBrands, setDesignerBrands] = useState<string[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [clientIsAuthenticated, setClientIsAuthenticated] = useState<boolean | null>(null);
  const [clientUserEmail, setClientUserEmail] = useState<string | null>(null);
  const [clientIsAdmin, setClientIsAdmin] = useState<boolean | null>(null);

  // Build auth URLs with current page as "next" parameter
  const loginUrl = useMemo(() => {
    if (pathname === '/') return '/auth/login';
    return `/auth/login?next=${encodeURIComponent(pathname)}`;
  }, [pathname]);

  const registerUrl = useMemo(() => {
    if (pathname === '/') return '/auth/register';
    return `/auth/register?next=${encodeURIComponent(pathname)}`;
  }, [pathname]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    let isActive = true;

    const loadSession = async () => {
      try {
        const response = await fetch('/api/auth/session', { cache: 'no-store' });
        if (!response.ok) {
          if (!isActive) return;
          setClientIsAuthenticated(false);
          setClientUserEmail(null);
          setClientIsAdmin(false);
          return;
        }

        const data = await response.json();
        if (!isActive) return;
        const user = data?.user ?? null;
        setClientIsAuthenticated(Boolean(user));
        setClientUserEmail(user?.email ?? null);
        setClientIsAdmin(data?.role === 'admin');
      } catch (error) {
        logError(error, { layer: "frontend", event: "navbar_load_session" });
        if (!isActive) return;
        setClientIsAuthenticated(false);
        setClientUserEmail(null);
        setClientIsAdmin(false);
      }
    };

    loadSession();

    return () => {
      isActive = false;
    };
  }, [pathname]);

  useEffect(() => {
    const handleCartUpdate = (e: Event) => {
      const event = e as CustomEvent;
      setLocalCartCount(event.detail?.count ?? 0);
    };

    window.addEventListener('cartUpdated', handleCartUpdate);
    return () => window.removeEventListener('cartUpdated', handleCartUpdate);
  }, []);

  useEffect(() => {
    const loadBrandGroups = async () => {
      try {
        const response = await fetch('/api/store/catalog/brand-groups');
        const data = await response.json();
        if (response.ok && Array.isArray(data.groups)) {
          setBrandGroups(data.groups);
        }
      } catch (error) {
        logError(error, { layer: "frontend", event: "navbar_load_brand_groups" });
      }
    };

    const loadDesignerBrands = async () => {
      try {
        const response = await fetch('/api/store/catalog/brands?groupKey=designer');
        const data = await response.json();
        if (response.ok && Array.isArray(data.brands)) {
          setDesignerBrands(data.brands);
        }
      } catch (error) {
        logError(error, { layer: "frontend", event: "navbar_load_designer_brands" });
      }
    };

    loadBrandGroups();
    loadDesignerBrands();
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

  useEffect(() => {
    if (!(clientIsAuthenticated ?? isAuthenticated)) {
      setIsProfileOpen(false);
    }
  }, [clientIsAuthenticated, isAuthenticated]);

  // Scroll lock when mobile menu is open
  useEffect(() => {
    if (!isMobileMenuOpen) return;

    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = prev;
    };
  }, [isMobileMenuOpen]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/';
  };

  const handleSearchClick = () => window.dispatchEvent(new CustomEvent('openSearch'));
  const handleCartClick = () => window.dispatchEvent(new CustomEvent('openCart'));

  const fallbackGroups = useMemo(
    () => [
      { key: 'nike', label: 'Nike' },
      { key: 'jordan', label: 'Jordan' },
      { key: 'new_balance', label: 'New Balance' },
      { key: 'asics', label: 'ASICS' },
      { key: 'yeezy', label: 'Yeezy' },
      { key: 'designer', label: 'Designer' },
    ],
    []
  );

  const resolvedBrandGroups = brandGroups.length > 0 ? brandGroups : fallbackGroups;

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

  const effectiveIsAuthenticated = clientIsAuthenticated ?? isAuthenticated;
  const effectiveUserEmail = clientUserEmail ?? userEmail;
  const showAuthButtons = !effectiveIsAuthenticated;
  const effectiveIsAdmin = clientIsAdmin ?? isAdmin;
  const showAdminLink = effectiveIsAdmin;

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
    setMobileSection(null);
  };

  const mobileOverlay = (
    <div className="md:hidden fixed inset-0 z-[9999] bg-black">
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-zinc-900 flex items-center justify-between">
          <span className="text-white font-bold text-2xl">Menu</span>
          <button
            onClick={closeMobileMenu}
            className="text-gray-400 hover:text-white cursor-pointer"
            aria-label="Close menu"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto py-3">
          <div className="px-3">
            {/* Shop All */}
            <Link
              href="/store"
              onClick={closeMobileMenu}
              className="flex items-center justify-between px-4 py-3 text-gray-200 hover:text-white hover:bg-zinc-900 transition-colors border-b border-zinc-900"
            >
              <span className="flex items-center gap-3">
                <ShoppingBag className="w-4 h-4" />
                Shop All
              </span>
            </Link>

            {/* Categories */}
            <button
              className="w-full flex items-center justify-between px-4 py-3 text-gray-300 hover:text-white hover:bg-zinc-900 transition-colors border-b border-zinc-900 text-left"
              onClick={() => setMobileSection(mobileSection === 'shop' ? null : 'shop')}
              aria-expanded={mobileSection === 'shop'}
            >
              <span className="flex items-center gap-3">
                <ShoppingBag className="w-4 h-4" />
                Categories
              </span>
              <ChevronDown
                className={`w-4 h-4 transition-transform ${mobileSection === 'shop' ? 'rotate-180' : ''}`}
              />
            </button>

            {mobileSection === 'shop' && (
              <div className="border-b border-zinc-900">
                {shopItems.map((it) => (
                  <Link
                    key={it.label}
                    href={it.href}
                    onClick={closeMobileMenu}
                    className="flex items-center px-4 py-3 pl-11 text-sm text-gray-400 hover:text-white hover:bg-zinc-900 transition-colors"
                  >
                    {it.label}
                  </Link>
                ))}
              </div>
            )}

            {/* Brands */}
            <button
              className="w-full flex items-center justify-between px-4 py-3 text-gray-300 hover:text-white hover:bg-zinc-900 transition-colors border-b border-zinc-900 text-left"
              onClick={() => setMobileSection(mobileSection === 'brands' ? null : 'brands')}
              aria-expanded={mobileSection === 'brands'}
            >
              <span className="flex items-center gap-3">
                <Tag className="w-4 h-4" />
                Brands
              </span>
              <ChevronDown
                className={`w-4 h-4 transition-transform ${mobileSection === 'brands' ? 'rotate-180' : ''}`}
              />
            </button>

            {mobileSection === 'brands' && (
              <div className="border-b border-zinc-900 py-2">
                {resolvedBrandGroups.map((group) => {
                  if (group.key === 'designer') {
                    return (
                      <div key={group.key} className="py-2">
                        <div className="px-4 pl-11 text-xs uppercase text-zinc-500 mb-2">{group.label}</div>
                        {designerBrands.map((brand) => (
                          <Link
                            key={brand}
                            href={buildStoreHref({ category: 'sneakers', brand })}
                            onClick={closeMobileMenu}
                            className="flex items-center px-4 py-3 pl-11 text-sm text-gray-400 hover:text-white hover:bg-zinc-900 transition-colors"
                          >
                            {brand}
                          </Link>
                        ))}
                      </div>
                    );
                  }

                  return (
                    <Link
                      key={group.key}
                      href={buildStoreHref({ category: 'sneakers', brand: group.label })}
                      onClick={closeMobileMenu}
                      className="flex items-center px-4 py-3 pl-11 text-sm text-gray-400 hover:text-white hover:bg-zinc-900 transition-colors"
                    >
                      {group.label}
                    </Link>
                  );
                })}
              </div>
            )}

            {/* Sneaker Sizes */}
            <button
              className="w-full flex items-center justify-between px-4 py-3 text-gray-300 hover:text-white hover:bg-zinc-900 transition-colors border-b border-zinc-900 text-left"
              onClick={() => setMobileSection(mobileSection === 'shoeSizes' ? null : 'shoeSizes')}
              aria-expanded={mobileSection === 'shoeSizes'}
            >
              <span className="flex items-center gap-3">
                <Ruler className="w-4 h-4" />
                Sneaker Sizes
              </span>
              <ChevronDown
                className={`w-4 h-4 transition-transform ${mobileSection === 'shoeSizes' ? 'rotate-180' : ''}`}
              />
            </button>

            {mobileSection === 'shoeSizes' && (
              <div className="border-b border-zinc-900 px-4 py-4">
                <div className="pl-7 grid grid-cols-4 gap-2 max-h-72 overflow-auto">
                  {SHOE_SIZES.map((size) => (
                    <Link
                      key={size}
                      href={buildStoreHref({ category: 'sneakers', sizeShoe: size })}
                      onClick={closeMobileMenu}
                      className="px-3 py-2 text-center text-xs text-gray-300 bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 transition-colors"
                    >
                      {size}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Clothing Sizes */}
            <button
              className="w-full flex items-center justify-between px-4 py-3 text-gray-300 hover:text-white hover:bg-zinc-900 transition-colors border-b border-zinc-900 text-left"
              onClick={() => setMobileSection(mobileSection === 'clothingSizes' ? null : 'clothingSizes')}
              aria-expanded={mobileSection === 'clothingSizes'}
            >
              <span className="flex items-center gap-3">
                <Shirt className="w-4 h-4" />
                Clothing Sizes
              </span>
              <ChevronDown
                className={`w-4 h-4 transition-transform ${mobileSection === 'clothingSizes' ? 'rotate-180' : ''}`}
              />
            </button>

            {mobileSection === 'clothingSizes' && (
              <div className="border-b border-zinc-900 px-4 py-4">
                <div className="pl-7 grid grid-cols-4 gap-2">
                  {CLOTHING_SIZES.map((size) => (
                    <Link
                      key={size}
                      href={buildStoreHref({ category: 'clothing', sizeClothing: size })}
                      onClick={closeMobileMenu}
                      className="px-3 py-2 text-center text-xs text-gray-300 bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 transition-colors"
                    >
                      {size}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between h-16">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 relative flex-shrink-0">
              <Image
                src="/images/rdk-logo.png"
                alt="Real Deal Kickz"
                fill
                sizes="40px"
                className="object-contain"
              />
            </div>
            <span className="text-white font-bold text-lg tracking-tight hidden sm:block">
              REALDEALKICKZSC
            </span>
          </Link>

          <div className="hidden lg:flex items-center gap-1">
            <div className="relative group">
              <button
                type="button"
                className="flex items-center gap-1 px-3 py-2 text-gray-300 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <span className="text-sm">Shop</span>
                <ChevronDown className="w-3 h-3" />
              </button>

              <MenuShell align="left">
                <div className="p-6 border-b border-zinc-900">
                  <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">
                    Shop Categories
                  </h3>
                </div>
                <div>
                  {shopItems.map((it) => (
                    <MegaLink
                      key={it.label}
                      href={it.href}
                      icon={it.icon}
                      label={it.label}
                      description={it.description}
                    />
                  ))}
                </div>
              </MenuShell>
            </div>

            <div className="relative group">
              <button
                type="button"
                className="flex items-center gap-1 px-3 py-2 text-gray-300 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <span className="text-sm">Brands</span>
                <ChevronDown className="w-3 h-3" />
              </button>

              <MenuShell align="left">
                <div className="p-6 border-b border-zinc-900">
                  <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">
                    Shop by Brand
                  </h3>
                  <p className="text-xs text-zinc-600">Premium sneaker & streetwear brands</p>
                </div>

                <div className="p-6">
                  <div className="grid grid-cols-2 gap-4">
                    {resolvedBrandGroups.map((group) => {
                      if (group.key === 'designer') {
                        return (
                          <div key={group.key} className="col-span-2">
                            <div className="text-xs uppercase text-zinc-500 mb-2">{group.label}</div>
                            <div className="grid grid-cols-2 gap-2">
                              {designerBrands.map((brand) => (
                                <Link
                                  key={brand}
                                  href={buildStoreHref({ category: 'sneakers', brand })}
                                  className="px-3 py-2 text-xs font-semibold text-white bg-zinc-900 hover:bg-red-600 transition-colors border border-zinc-800 hover:border-red-600 cursor-pointer"
                                >
                                  {brand}
                                </Link>
                              ))}
                            </div>
                          </div>
                        );
                      }

                      return (
                        <Link
                          key={group.key}
                          href={buildStoreHref({ category: 'sneakers', brand: group.label })}
                          className="px-4 py-3 text-sm font-semibold text-white bg-zinc-900 hover:bg-red-600 transition-colors border border-zinc-800 hover:border-red-600 cursor-pointer"
                        >
                          {group.label}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </MenuShell>
            </div>

            <div className="relative group">
              <button
                type="button"
                className="flex items-center gap-1 px-3 py-2 text-gray-300 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <span className="text-sm">Sneaker Sizes</span>
                <ChevronDown className="w-3 h-3" />
              </button>

              <MenuShell align="left">
                <div className="p-6 border-b border-zinc-900">
                  <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">
                    Find Your Size
                  </h3>
                  <p className="text-xs text-zinc-600">Men&apos;s, Women&apos;s & Youth sizes available</p>
                </div>

                <div className="p-6 space-y-6 max-h-[400px] overflow-y-auto custom-scrollbar">
                  <div>
                    <div className="text-xs font-bold text-zinc-600 uppercase tracking-wider mb-3">Youth</div>
                    <div className="grid grid-cols-4 gap-2">
                      {SHOE_SIZE_GROUPS.youth.map((size) => (
                        <Link
                          key={size}
                          href={buildStoreHref({ category: 'sneakers', sizeShoe: size })}
                          className="px-3 py-2 text-center text-xs font-semibold text-white bg-zinc-900 hover:bg-red-600 transition-colors border border-zinc-800 hover:border-red-600 cursor-pointer"
                        >
                          {size}
                        </Link>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs font-bold text-zinc-600 uppercase tracking-wider mb-3">Men&apos;s</div>
                    <div className="grid grid-cols-4 gap-2">
                      {SHOE_SIZE_GROUPS.mens.map((size) => (
                        <Link
                          key={size}
                          href={buildStoreHref({ category: 'sneakers', sizeShoe: size })}
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

            <div className="relative group">
              <button
                type="button"
                className="flex items-center gap-1 px-3 py-2 text-gray-300 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <span className="text-sm">Clothing Sizes</span>
                <ChevronDown className="w-3 h-3" />
              </button>

              <MenuShell align="left">
                <div className="p-6 border-b border-zinc-900">
                  <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">
                    Clothing Sizes
                  </h3>
                  <p className="text-xs text-zinc-600">Filter streetwear by your perfect fit</p>
                </div>

                <div className="p-6">
                  <div className="grid grid-cols-4 gap-3">
                    {CLOTHING_SIZES.map((size) => (
                      <Link
                        key={size}
                        href={buildStoreHref({ category: 'clothing', sizeClothing: size })}
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

          <button
            onClick={handleSearchClick}
            className="text-gray-300 hover:text-white transition-colors cursor-pointer"
            aria-label="Search"
          >
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

          {effectiveIsAuthenticated ? (
            <div ref={profileRef} className="relative">
              <button
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center space-x-2 text-gray-300 hover:text-white transition-colors cursor-pointer"
              >
                <User className="w-5 h-5" />
                <ChevronDown className="w-3 h-3" />
              </button>

              {isProfileOpen && (
                <div
                  className="absolute right-0 mt-3 w-64 border border-zinc-800 bg-black shadow-2xl z-50"
                  onClick={(event) => event.stopPropagation()}
                >
                  {effectiveUserEmail && (
                    <div className="px-4 py-3 border-b border-zinc-900">
                      <p className="text-xs text-zinc-500 truncate">{effectiveUserEmail}</p>
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
          ) : showAuthButtons ? (
            <div className="flex items-center gap-2">
              <Link
                href={loginUrl}
                className="px-4 py-2 text-sm font-semibold text-gray-300 hover:text-white transition-colors cursor-pointer"
              >
                Login
              </Link>
              <Link
                href={registerUrl}
                className="px-4 py-2 text-sm font-bold bg-red-600 hover:bg-red-700 text-white transition-colors cursor-pointer"
              >
                Sign Up
              </Link>
            </div>
          ) : null}

          {effectiveIsAuthenticated && showAdminLink && (
            <Link
              href="/admin"
              className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Admin Dashboard
            </Link>
          )}
        </div>

        <div className="flex items-center gap-3 md:hidden">
          {showAdminLink && (
            <Link
              href="/admin"
              className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-zinc-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="sm:hidden">Admin</span>
              <span className="hidden sm:inline">Back to Admin Dashboard</span>
            </Link>
          )}
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="text-gray-300 cursor-pointer"
            aria-label="Open menu"
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Mobile Menu (Portal to avoid ScrollHeader transform issues) */}
      {isMounted && isMobileMenuOpen ? createPortal(mobileOverlay, document.body) : null}
    </nav>
  );
}
