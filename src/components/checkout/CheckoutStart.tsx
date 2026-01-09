// src/components/checkout/CheckoutStart.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useCart } from "@/components/cart/CartProvider";
import { OrderSummary } from "@/components/checkout/OrderSummary";
import type { CartItem } from "@/types/views/cart";
import { clientEnv } from "@/config/client-env";
import {
  clearIdempotencyKeyFromStorage,
  generateIdempotencyKey,
  getIdempotencyKeyFromStorage,
  setIdempotencyKeyInStorage,
} from "@/lib/idempotency";
import { CartSnapshotService } from "@/services/cart-snapshot-service";

const buildCartSignature = (items: CartItem[]) => {
  const sorted = [...items].sort((a, b) => {
    const aKey = `${a.productId}:${a.variantId}`;
    const bKey = `${b.productId}:${b.variantId}`;
    return aKey.localeCompare(bKey);
  });
  return JSON.stringify(
    sorted.map((item) => ({
      productId: item.productId,
      variantId: item.variantId,
      quantity: item.quantity,
    }))
  );
};

const guestEnabled = clientEnv.NEXT_PUBLIC_GUEST_CHECKOUT_ENABLED === "true";

export function CheckoutStart() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { items, isReady, setCartItems } = useCart();

  const [idempotencyKey, setIdempotencyKey] = useState<string | null>(null);
  const [fulfillment, setFulfillment] = useState<"ship" | "pickup">("ship");
  const [shipping, setShipping] = useState(0);
  const [isUpdatingShipping, setIsUpdatingShipping] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [guestEmail, setGuestEmail] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);

  const isGuestFlow = searchParams.get("guest") === "1";
  const snapshotService = useMemo(() => new CartSnapshotService(), []);

  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + (item.priceCents * item.quantity) / 100, 0),
    [items]
  );
  const total = subtotal + shipping;

  useEffect(() => {
    const loadSession = async () => {
      try {
        const response = await fetch("/api/auth/session", { cache: "no-store" });
        const data = await response.json().catch(() => null);
        setIsAuthenticated(Boolean(data?.user));
      } catch {
        setIsAuthenticated(false);
      }
    };

    loadSession();
  }, []);

  useEffect(() => {
    if (!isReady) return;

    if (items.length === 0) {
      setIsRestoring(true);
      snapshotService
        .restoreCart()
        .then((restored) => {
          if (restored && restored.length > 0) {
            setCartItems(restored);
          } else {
            router.push("/cart");
          }
        })
        .finally(() => setIsRestoring(false));
    }
  }, [isReady, items.length, router, setCartItems, snapshotService]);

  useEffect(() => {
    if (!isReady) return;
    if (!isGuestFlow) return;

    try {
      const stored = localStorage.getItem("rdk_guest_email");
      setGuestEmail(stored ? stored.trim() : null);
    } catch {
      setGuestEmail(null);
    }
  }, [isReady, isGuestFlow]);

  useEffect(() => {
    if (!isReady || items.length === 0) return;

    const signature = buildCartSignature(items);
    try {
      const storedSignature = sessionStorage.getItem("checkout_cart_signature");
      const storedKey = getIdempotencyKeyFromStorage();
      if (!storedKey || storedSignature !== signature) {
        const nextKey = generateIdempotencyKey();
        setIdempotencyKeyInStorage(nextKey);
        sessionStorage.setItem("checkout_cart_signature", signature);
        setIdempotencyKey(nextKey);
        return;
      }
      setIdempotencyKey(storedKey);
    } catch {
      const fallbackKey = generateIdempotencyKey();
      setIdempotencyKeyInStorage(fallbackKey);
      setIdempotencyKey(fallbackKey);
    }
  }, [isReady, items]);

  useEffect(() => {
    if (!isReady || items.length === 0) return;

    const calculate = async () => {
      if (fulfillment === "pickup") {
        setShipping(0);
        return;
      }

      setIsUpdatingShipping(true);
      try {
        const response = await fetch("/api/checkout/calculate-shipping", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productIds: items.map((item) => item.productId) }),
        });

        const data = await response.json().catch(() => null);
        if (response.ok) {
          setShipping(Number(data?.shippingCost ?? 0));
        }
      } finally {
        setIsUpdatingShipping(false);
      }
    };

    calculate();
  }, [fulfillment, isReady, items]);

  useEffect(() => {
    if (isAuthenticated === null) return;
    if (isAuthenticated) return;
    if (!isGuestFlow || !guestEnabled) {
      router.push("/checkout");
    }
  }, [isAuthenticated, isGuestFlow, router]);

  const handleSubmit = async () => {
    if (!idempotencyKey) return;
    setError(null);

    if (!isAuthenticated && !guestEmail) {
      setError("We need your email to continue as a guest.");
      router.push("/checkout");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/checkout/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idempotencyKey,
          fulfillment,
          guestEmail: isAuthenticated ? undefined : guestEmail ?? undefined,
          items: items.map((item) => ({
            productId: item.productId,
            variantId: item.variantId,
            quantity: item.quantity,
          })),
        }),
      });

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        if (data?.code === "CART_MISMATCH" || data?.code === "IDEMPOTENCY_KEY_EXPIRED") {
          clearIdempotencyKeyFromStorage();
        }
        throw new Error(data?.error || "Failed to start checkout");
      }

      if (data?.url) {
        window.location.href = data.url;
        return;
      }

      throw new Error("Checkout URL missing.");
    } catch (err: any) {
      setError(err?.message ?? "Failed to start checkout.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isReady || isRestoring || items.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <Loader2 className="w-12 h-12 text-red-600 animate-spin mx-auto mb-4" />
        <p className="text-gray-400">Preparing your checkout...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Secure Checkout</h1>
          <p className="text-gray-400">
            Choose shipping or local pickup, then continue to Stripe Checkout.
          </p>
        </div>
        <Link href="/cart" className="text-sm text-gray-400 hover:text-white transition">
          Back to cart
        </Link>
      </div>

      {error && (
        <div className="mb-6 bg-red-900/20 border border-red-500 text-red-400 p-4 rounded">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-zinc-900 border border-zinc-800/70 rounded p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Fulfillment</h2>
            <div className="space-y-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="fulfillment"
                  checked={fulfillment === "ship"}
                  onChange={() => setFulfillment("ship")}
                  className="rdk-radio mt-1"
                />
                <div>
                  <p className="text-white font-medium">Ship to me</p>
                  <p className="text-sm text-zinc-400">Shipping address collected in Stripe Checkout.</p>
                </div>
              </label>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="fulfillment"
                  checked={fulfillment === "pickup"}
                  onChange={() => setFulfillment("pickup")}
                  className="rdk-radio mt-1"
                />
                <div>
                  <p className="text-white font-medium">Local pickup</p>
                  <p className="text-sm text-zinc-400">
                    We will email pickup instructions and coordinate a time.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {!isAuthenticated && guestEmail && (
            <div className="bg-zinc-900 border border-zinc-800/70 rounded p-6">
              <h2 className="text-lg font-semibold text-white mb-2">Guest email</h2>
              <p className="text-sm text-zinc-400">{guestEmail}</p>
            </div>
          )}

          <div className="bg-zinc-900 border border-zinc-800/70 rounded p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Ready to pay</h2>
            <p className="text-sm text-zinc-400 mb-4">
              You will be redirected to Stripe Checkout to complete payment.
            </p>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 rounded transition"
              data-testid="checkout-start"
            >
              {isSubmitting ? "Redirecting..." : "Continue to secure payment"}
            </button>
          </div>
        </div>

        <div className="lg:col-span-1">
          <OrderSummary
            items={items}
            subtotal={subtotal}
            shipping={shipping}
            total={total}
            fulfillment={fulfillment}
            isUpdatingShipping={isUpdatingShipping}
          />
        </div>
      </div>
    </div>
  );
}
