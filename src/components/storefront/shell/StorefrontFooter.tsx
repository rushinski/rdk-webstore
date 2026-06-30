"use client";

import { useState } from "react";
import Link from "next/link";

import { buttonStyles } from "@/components/ui/buttonStyles";
import { inputStyles } from "@/components/ui/inputStyles";

export function StorefrontFooter() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus(null);

    if (!email.trim()) {
      setStatus("Please enter your email.");
      return;
    }

    const response = await fetch("/api/email/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim(), source: "footer" }),
    });
    const payload = await response.json();

    if (!payload.ok) {
      setStatus(payload.error ?? "Subscription failed.");
      return;
    }

    setEmail("");
    setStatus("Thanks for subscribing.");
  }

  return (
    <footer className="mt-20 border-t border-brand-border bg-brand-page pb-12">
      <div className="mx-auto max-w-brand px-6 py-12 md:px-12 lg:px-16">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <h3 className="text-2xl font-bold uppercase tracking-[0.12em] text-brand-text">
              solesneakers
            </h3>
            <p className="mt-4 max-w-md text-sm text-brand-muted">
              Elevated curation of footwear and style. Newsletter, release updates, and
              editorial product drops.
            </p>
            <form
              onSubmit={(event) => void handleSubmit(event)}
              className="mt-6 flex max-w-md flex-col gap-3 sm:flex-row"
            >
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="E-mail"
                className={inputStyles}
              />
              <button type="submit" className={buttonStyles.primary}>
                Subscribe
              </button>
            </form>
            {status ? <p className="mt-2 text-sm text-brand-muted">{status}</p> : null}
          </div>

          <div>
            <h4 className="text-sm font-bold uppercase tracking-[0.12em] text-brand-text">
              Shop
            </h4>
            <div className="mt-4 space-y-2 text-sm text-brand-muted">
              <Link href="/store" className="block hover:text-brand-text">
                Shop All
              </Link>
              <Link
                href="/store?category=sneakers"
                className="block hover:text-brand-text"
              >
                Sneakers
              </Link>
              <Link
                href="/store?category=clothing"
                className="block hover:text-brand-text"
              >
                Clothing
              </Link>
              <Link
                href="/store?category=accessories"
                className="block hover:text-brand-text"
              >
                Accessories
              </Link>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-bold uppercase tracking-[0.12em] text-brand-text">
              Info
            </h4>
            <div className="mt-4 space-y-2 text-sm text-brand-muted">
              <a href="mailto:null@gmail.com" className="block hover:text-brand-text">
                null@gmail.com
              </a>
              <Link href="/contact" className="block hover:text-brand-text">
                Contact
              </Link>
              <Link href="/shipping" className="block hover:text-brand-text">
                Shipping
              </Link>
              <Link href="/refunds" className="block hover:text-brand-text">
                Returns
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
