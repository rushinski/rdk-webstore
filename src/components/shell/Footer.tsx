// src/components/shell/Footer.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { Instagram, MapPin, Phone, Mail } from "lucide-react";

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
    <footer className="bg-black border-t border-zinc-800 mt-20 pb-32 md:pb-0">
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

          {/* Contact Information */}
          <div>
            <h4 className="text-white font-semibold mb-4 text-sm">Contact</h4>
            <ul className="space-y-3">
              <li className="flex items-start gap-2 text-zinc-500 text-sm">
                <Mail className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <a href="mailto:realdealholyspill@gmail.com" className="hover:text-white transition-colors">
                  realdealholyspill@gmail.com
                </a>
              </li>
              <li className="flex items-start gap-2 text-zinc-500 text-sm">
                <Instagram className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <a
                  href="https://instagram.com/realdealkickzllc"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition-colors"
                >
                  @realdealkickzllc
                </a>
              </li>
              <li className="flex items-start gap-2 text-zinc-500 text-sm">
                <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span className="hover:text-white transition-colors">
                  Columbia, SC 29201
                </span>
              </li>
            </ul>
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

          {/* Support & Social */}
          <div>
            <h4 className="text-white font-semibold mb-4 text-sm">Support</h4>
            <ul className="space-y-2 mb-6">
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
                <Link href="/shipping" className="text-zinc-500 hover:text-white text-sm transition-colors">
                  Shipping
                </Link>
              </li>
              <li>
                <Link href="/refunds" className="text-zinc-500 hover:text-white text-sm transition-colors">
                  Refunds &amp; Returns
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-zinc-800 pt-6 flex flex-col sm:flex-row justify-between items-center gap-3">
          <p className="text-zinc-400 text-xs sm:text-[11px] text-center sm:text-left">
            © 2025 Realdealkickzsc. All rights reserved.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/terms" className="text-zinc-400 hover:text-white text-xs transition-colors">
              Terms
            </Link>
            <Link href="/privacy" className="text-zinc-400 hover:text-white text-xs transition-colors">
              Privacy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
