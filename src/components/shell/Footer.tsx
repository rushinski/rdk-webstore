// src/components/shell/Footer.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, Instagram, Youtube } from "lucide-react";

export function Footer() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function handleEmailSignup(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);

    if (!email.trim()) {
      setMessage({ type: "error", text: "Please enter your email" });
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch("/api/email/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), source: "footer" }),
      });

      const json = await res.json();

      if (!json.ok) {
        setMessage({ type: "error", text: json.error ?? "Subscription failed" });
        return;
      }

      setMessage({ type: "success", text: "Thanks for subscribing!" });
      setEmail("");
    } catch (err) {
      setMessage({ type: "error", text: "Something went wrong. Please try again." });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <footer className="bg-black border-t border-zinc-800 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 mb-8">
          {/* Brand + Email Signup */}
          <div className="lg:col-span-2">
            <h3 className="text-white font-bold text-lg mb-4">REALDEALKICKZSC</h3>
            <p className="text-zinc-500 text-sm mb-6">
              Premium sneakers and streetwear. Authenticity guaranteed.
            </p>

            {/* Email Signup */}
            <div>
              <p className="text-white text-sm font-medium mb-3">Get drop alerts & exclusives</p>
              <form onSubmit={handleEmailSignup} className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    disabled={isSubmitting}
                    className="flex-1 h-10 bg-zinc-900 border border-zinc-800 px-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-700 transition-colors disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="h-10 px-6 bg-red-600 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? "..." : "Subscribe"}
                  </button>
                </div>
                {message && (
                  <p className={`text-xs ${message.type === "success" ? "text-emerald-500" : "text-red-500"}`}>
                    {message.text}
                  </p>
                )}
              </form>
            </div>
          </div>

          {/* Shop */}
          <div>
            <h4 className="text-white font-semibold mb-4 text-sm">Shop</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/store" className="text-zinc-500 hover:text-white text-sm transition-colors">
                  All Products
                </Link>
              </li>
              <li>
                <Link href="/store?category=sneakers" className="text-zinc-500 hover:text-white text-sm transition-colors">
                  Sneakers
                </Link>
              </li>
              <li>
                <Link href="/store?category=clothing" className="text-zinc-500 hover:text-white text-sm transition-colors">
                  Clothing
                </Link>
              </li>
              <li>
                <Link href="/store?category=accessories" className="text-zinc-500 hover:text-white text-sm transition-colors">
                  Accessories
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="text-white font-semibold mb-4 text-sm">Support</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/about" className="text-zinc-500 hover:text-white text-sm transition-colors">
                  About
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-zinc-500 hover:text-white text-sm transition-colors">
                  Contact
                </Link>
              </li>
              <li>
                <Link href="/faq" className="text-zinc-500 hover:text-white text-sm transition-colors">
                  FAQ
                </Link>
              </li>
              <li>
                <Link href="/shipping" className="text-zinc-500 hover:text-white text-sm transition-colors">
                  Shipping & Returns
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal & Social */}
          <div>
            <h4 className="text-white font-semibold mb-4 text-sm">Connect</h4>
            <div className="flex gap-4 mb-6">
              <a
                href="mailto:info@realdealkickzsc.com"
                className="text-zinc-500 hover:text-white transition-colors"
                aria-label="Email"
              >
                <Mail className="w-5 h-5" />
              </a>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-zinc-500 hover:text-white transition-colors"
                aria-label="Instagram"
              >
                <Instagram className="w-5 h-5" />
              </a>
              <a
                href="https://youtube.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-zinc-500 hover:text-white transition-colors"
                aria-label="YouTube"
              >
                <Youtube className="w-5 h-5" />
              </a>
            </div>
            <ul className="space-y-2">
              <li>
                <Link href="/terms" className="text-zinc-500 hover:text-white text-sm transition-colors">
                  Terms
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-zinc-500 hover:text-white text-sm transition-colors">
                  Privacy
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-zinc-800 pt-8 text-center text-zinc-600 text-xs">
          © 2025 Real Deal Kickz. All rights reserved.
        </div>
      </div>
    </footer>
  );
}