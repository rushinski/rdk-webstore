"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { clientEnv } from "@/config/client-env";
import { useCart } from "@/components/cart/CartProvider";
import { CartSnapshotService } from "@/services/cart-snapshot-service";

const guestEnabled = clientEnv.NEXT_PUBLIC_GUEST_CHECKOUT_ENABLED === "true";
const benefits = ["Quicker checkout", "Order history", "Built-in messaging system"];

export function CheckoutGate() {
  const router = useRouter();
  const { items, isReady } = useCart();
  const [error, setError] = useState<string | null>(null);

  const snapshotService = useMemo(() => new CartSnapshotService(), []);

  useEffect(() => {
    if (!isReady) {
      return;
    }
    if (items.length === 0) {
      router.push("/cart");
    }
  }, [isReady, items.length, router]);

  const handleAuthRedirect = async (path: string) => {
    setError(null);
    try {
      await snapshotService.backupCart(items);
    } catch {
      // ignore snapshot failures
    }
    router.push(path);
  };

  const handleGuestContinue = async () => {
    setError(null);
    try {
      await snapshotService.backupCart(items);
      router.push("/checkout/start?guest=1");
    } catch {
      setError("Failed to continue. Please try again.");
    }
  };

  if (!isReady || items.length === 0) {
    return null;
  }

  return (
    <div className="mx-auto max-w-5xl px-4 pt-2 sm:py-10">
      <p className="text-xs uppercase tracking-[0.35em] text-brand-muted">Checkout</p>
      <h1 className="mb-2 mt-3 text-3xl font-black uppercase tracking-[0.08em] text-brand-text">
        Choose how to continue
      </h1>
      <p className="mb-8 text-brand-muted">
        Creating an account keeps your order history and messaging in one place.
      </p>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="border border-brand-border bg-brand-surface p-6 shadow-[0_20px_60px_rgba(17,17,17,0.06)]">
            <h2 className="mb-4 text-xl font-bold uppercase tracking-[0.08em] text-brand-text">
              Continue As
            </h2>

            {error && (
              <div className="mb-4 border border-red-200 bg-red-50 p-3 text-red-700">
                {error}
              </div>
            )}

            <div className="space-y-3">
              <button
                onClick={() => {
                  void handleGuestContinue();
                }}
                disabled={!guestEnabled}
                className={`w-full px-5 py-3 text-sm font-semibold uppercase tracking-[0.08em] transition ${
                  guestEnabled
                    ? "border border-brand-text bg-brand-text text-brand-surface hover:bg-neutral-800"
                    : "cursor-not-allowed border border-brand-border bg-brand-page text-brand-muted"
                }`}
              >
                Continue as guest
              </button>

              <button
                onClick={() => {
                  void handleAuthRedirect("/auth/login?next=/checkout");
                }}
                className="w-full border border-brand-border bg-brand-surface px-5 py-3 text-sm font-semibold uppercase tracking-[0.08em] text-brand-text transition hover:border-brand-text hover:bg-brand-page"
              >
                Sign in
              </button>

              <button
                onClick={() => {
                  void handleAuthRedirect("/auth/register?next=/checkout");
                }}
                className="w-full border border-brand-border bg-brand-page px-5 py-3 text-sm font-semibold uppercase tracking-[0.08em] text-brand-text transition hover:border-brand-text"
              >
                Create account
              </button>

              {!guestEnabled && (
                <p className="text-xs text-brand-muted">
                  Guest checkout is currently disabled. Sign in or create an account to
                  continue.
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="hidden h-fit border border-brand-border bg-brand-surface p-6 shadow-[0_20px_60px_rgba(17,17,17,0.06)] lg:block">
          <h2 className="mb-4 text-lg font-bold uppercase tracking-[0.08em] text-brand-text">
            Account benefits
          </h2>
          <ul className="space-y-3 text-sm text-brand-muted">
            {benefits.map((benefit) => (
              <li key={benefit} className="flex items-start gap-2">
                <span className="mt-1 h-2 w-2 rounded-full bg-brand-text" />
                <span>{benefit}</span>
              </li>
            ))}
          </ul>

          <div className="mt-6 text-xs text-brand-muted">
            Already have an account?{" "}
            <Link
              href="/auth/login?next=/checkout"
              className="font-semibold text-brand-text transition-colors hover:text-neutral-600"
            >
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
