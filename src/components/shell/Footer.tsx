// src/components/shell/Footer.tsx

import Link from 'next/link';
import { Mail, Instagram, Youtube } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-black border-t border-red-900/20 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div>
            <h3 className="text-white font-bold text-lg mb-4">REALDEALKICKZSC</h3>
            <p className="text-gray-400 text-sm">
              Premium sneakers and streetwear. Authenticity guaranteed.
            </p>
          </div>

          {/* Shop */}
          <div>
            <h4 className="text-white font-semibold mb-4">Shop</h4>
            <ul className="space-y-2">
              <li><Link href="/store" className="text-gray-400 hover:text-white text-sm">All Products</Link></li>
              <li><Link href="/store?category=sneakers" className="text-gray-400 hover:text-white text-sm">Sneakers</Link></li>
              <li><Link href="/store?category=clothing" className="text-gray-400 hover:text-white text-sm">Clothing</Link></li>
              <li><Link href="/store?category=accessories" className="text-gray-400 hover:text-white text-sm">Accessories</Link></li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="text-white font-semibold mb-4">Support</h4>
            <ul className="space-y-2">
              <li><Link href="/about" className="text-gray-400 hover:text-white text-sm">About</Link></li>
              <li><Link href="/contact" className="text-gray-400 hover:text-white text-sm">Contact</Link></li>
              <li><Link href="/faq" className="text-gray-400 hover:text-white text-sm">FAQ</Link></li>
              <li><Link href="/shipping" className="text-gray-400 hover:text-white text-sm">Shipping & Returns</Link></li>
            </ul>
          </div>

          {/* Legal & Social */}
          <div>
            <h4 className="text-white font-semibold mb-4">Connect</h4>
            <div className="flex space-x-4 mb-4">
              <a href="mailto:info@realdealkickzsc.com" className="text-gray-400 hover:text-white">
                <Mail className="w-5 h-5" />
              </a>
              <a href="https://instagram.com" className="text-gray-400 hover:text-white">
                <Instagram className="w-5 h-5" />
              </a>
              <a href="https://youtube.com" className="text-gray-400 hover:text-white">
                <Youtube className="w-5 h-5" />
              </a>
            </div>
            <ul className="space-y-2">
              <li><Link href="/terms" className="text-gray-400 hover:text-white text-sm">Terms</Link></li>
              <li><Link href="/privacy" className="text-gray-400 hover:text-white text-sm">Privacy</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-red-900/20 mt-8 pt-8 text-center text-gray-400 text-sm">
          © 2025 Real Deal Kickz. All rights reserved.
        </div>
      </div>
    </footer>
  );
}