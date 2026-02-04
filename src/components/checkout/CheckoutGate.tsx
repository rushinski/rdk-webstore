// src/components/checkout/CheckoutGate.tsx
"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { useCart } from "@/components/cart/CartProvider";
import { CartSnapshotService } from "@/services/cart-snapshot-service";
import { clientEnv } from "@/config/client-env";

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
    <div className="max-w-5xl mx-auto px-4 pt-2 sm:py-10">
      <h1 className="text-3xl font-bold text-white mb-2">Checkout</h1>
      <p className="text-gray-400 mb-8">
        Choose how you want to continue. Creating an account keeps your order history and
        messaging in one place.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-zinc-900 border border-zinc-800/70 rounded p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Continue as</h2>

            {error && (
              <div className="mb-4 bg-red-900/20 border border-red-500 text-red-400 p-3 rounded">
                {error}
              </div>
            )}

            <div className="space-y-3">
              <button
                onClick={() => {
                  void handleGuestContinue();
                }}
                disabled={!guestEnabled}
                className={`w-full px-5 py-3 rounded font-semibold transition ${
                  guestEnabled
                    ? "bg-red-600 hover:bg-red-700 text-white"
                    : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                }`}
              >
                Continue as Guest
              </button>

              <button
                onClick={() => {
                  void handleAuthRedirect("/auth/login?next=/checkout");
                }}
                className="w-full px-5 py-3 rounded font-semibold border border-zinc-700 text-white hover:border-white transition"
              >
                Sign in
              </button>

              <button
                onClick={() => {
                  void handleAuthRedirect("/auth/register?next=/checkout");
                }}
                className="w-full px-5 py-3 rounded font-semibold bg-zinc-800 text-white hover:bg-zinc-700 transition"
              >
                Create account
              </button>

              {!guestEnabled && (
                <p className="text-xs text-zinc-500">
                  Guest checkout is currently disabled. Sign in or create an account to
                  continue.
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="hidden lg:block bg-zinc-900 border border-zinc-800/70 rounded p-6 h-fit">
          <h2 className="text-lg font-semibold text-white mb-4">Account benefits</h2>
          <ul className="space-y-3 text-sm text-zinc-400">
            {benefits.map((benefit) => (
              <li key={benefit} className="flex items-start gap-2">
                <span className="mt-1 h-2 w-2 rounded-full bg-red-500"></span>
                <span>{benefit}</span>
              </li>
            ))}
          </ul>

          <div className="mt-6 text-xs text-zinc-500">
            Already have an account?{" "}
            <Link
              href="/auth/login?next=/checkout"
              className="text-red-500 hover:text-red-400"
            >
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}