// src/components/shell/Navbar.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Search, ShoppingCart, User, X, ChevronDown, Menu } from 'lucide-react';
import { CartService } from '@/services/cart-service';

export function Navbar() {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [isSignedIn, setIsSignedIn] = useState(false);

  useEffect(() => {
    const cart = new CartService();
    setCartCount(cart.getItemCount());

    const handleCartUpdate = () => {
      setCartCount(cart.getItemCount());
    };

    window.addEventListener('cartUpdated', handleCartUpdate);
    return () => window.removeEventListener('cartUpdated', handleCartUpdate);
  }, []);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/';
  };

  return (
    <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between h-16">
        {/* Logo */}
        <Link href="/" className="flex items-center space-x-3">
          <div className="w-10 h-10 relative">
            <Image
              src="/images/rdk-logo.png"
              alt="Real Deal Kickz"
              fill
              className="object-contain"
              sizes="36px"
            />
          </div>
          <span className="text-white font-bold text-lg tracking-tight">
            REALDEALKICKZSC
          </span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center space-x-6">
          {/* Category Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsCategoryOpen(!isCategoryOpen)}
              className="flex items-center text-gray-300 hover:text-white transition"
            >
              Shop <ChevronDown className="w-4 h-4 ml-1" />
            </button>
            {isCategoryOpen && (
              <div className="absolute top-full left-0 mt-2 w-48 bg-black border border-red-900/20 rounded shadow-lg">
                <Link
                  href="/store"
                  className="block px-4 py-2 text-gray-300 hover:bg-red-900/20 hover:text-white"
                >
                  Shop All
                </Link>
                <Link
                  href="/store?category=sneakers"
                  className="block px-4 py-2 text-gray-300 hover:bg-red-900/20 hover:text-white"
                >
                  Sneakers
                </Link>
                <Link
                  href="/store?category=clothing"
                  className="block px-4 py-2 text-gray-300 hover:bg-red-900/20 hover:text-white"
                >
                  Clothing
                </Link>
                <Link
                  href="/store?category=accessories"
                  className="block px-4 py-2 text-gray-300 hover:bg-red-900/20 hover:text-white"
                >
                  Accessories
                </Link>
                <Link
                  href="/store?category=electronics"
                  className="block px-4 py-2 text-gray-300 hover:bg-red-900/20 hover:text-white"
                >
                  Electronics
                </Link>
              </div>
            )}
          </div>

          <button
            onClick={() => setIsSearchOpen(true)}
            className="text-gray-300 hover:text-white transition"
          >
            <Search className="w-5 h-5" />
          </button>

          <Link
            href="/cart"
            className="relative text-gray-300 hover:text-white transition"
          >
            <ShoppingCart className="w-5 h-5" />
            {cartCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </Link>

          {/* Profile Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="flex items-center space-x-2 text-gray-300 hover:text-white transition"
            >
              <User className="w-5 h-5" />
              <span className="text-sm">Login/Signup</span>
            </button>
            {isProfileOpen && (
              <div className="absolute top-full right-0 mt-2 w-48 bg-black border border-red-900/20 rounded shadow-lg">
                {isSignedIn ? (
                  <>
                    <Link
                      href="/account"
                      className="block px-4 py-2 text-gray-300 hover:bg-red-900/20 hover:text-white"
                    >
                      User Settings
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="block w-full text-left px-4 py-2 text-gray-300 hover:bg-red-900/20 hover:text-white"
                    >
                      Logout
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      href="/auth/login"
                      className="block px-4 py-2 text-gray-300 hover:bg-red-900/20 hover:text-white"
                    >
                      Log In
                    </Link>
                    <Link
                      href="/auth/register"
                      className="block px-4 py-2 text-gray-300 hover:bg-red-900/20 hover:text-white"
                    >
                      Create Account
                    </Link>
                  </>
                )}
                <button
                  onClick={() => setIsProfileOpen(false)}
                  className="block w-full text-left px-4 py-2 text-gray-300 hover:bg-red-900/20 hover:text-white"
                >
                  <X className="w-4 h-4 inline mr-2" />
                  Close
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Menu Button */}
        <button className="md:hidden text-gray-300">
          <Menu className="w-6 h-6" />
        </button>
      </div>
    </nav>
  );
}