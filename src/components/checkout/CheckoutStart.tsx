// src/components/checkout/CheckoutStart.tsx
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe, type StripeElementsOptions } from "@stripe/stripe-js";
import { Loader2 } from "lucide-react";
import { useCart } from "@/components/cart/CartProvider";
import { CheckoutForm, type ShippingAddress } from "@/components/checkout/CheckoutForm";
import { OrderSummary } from "@/components/checkout/OrderSummary";
import type { CartItem } from "@/types/domain/cart";
import {
  clearIdempotencyKeyFromStorage,
  generateIdempotencyKey,
  getIdempotencyKeyFromStorage,
  setIdempotencyKeyInStorage,
} from "@/lib/idempotency";
import { CartSnapshotService } from "@/services/cart-snapshot-service";
import { clientEnv } from "@/config/client-env";
import { clearGuestShippingAddress } from "@/lib/checkout/guest-shipping-address";

const guestEnabled = clientEnv.NEXT_PUBLIC_GUEST_CHECKOUT_ENABLED === "true";

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
    })),
  );
};

const stripeAppearance: StripeElementsOptions["appearance"] = {
  theme: "night",
  variables: {
    fontFamily: "Arial, Helvetica, sans-serif",
    colorPrimary: "#dc2626",
    colorBackground: "#09090b",
    colorText: "#ffffff",
    colorTextSecondary: "#a1a1aa",
    colorDanger: "#dc2626",
    borderRadius: "2px",
  },
};

type ShippingPayload = {
  name: string;
  phone?: string | null;
  line1: string;
  line2?: string | null;
  city: string;
  state: string;
  postal_code: string;
  country: string;
} | null;

export function CheckoutStart() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { items, isReady, setCartItems } = useCart();

  const stripePromise = useMemo(
    () => loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!),
    [],
  );
  const snapshotService = useMemo(() => new CartSnapshotService(), []);

  const [idempotencyKey, setIdempotencyKey] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);

  const [subtotal, setSubtotal] = useState(0);
  const [shipping, setShipping] = useState(0);
  const [tax, setTax] = useState(0);
  const [total, setTotal] = useState(0);

  const [fulfillment, setFulfillment] = useState<"ship" | "pickup">("ship");
  const [shippingAddress, setShippingAddress] = useState<ShippingAddress | null>(null);

  const [guestEmail, setGuestEmail] = useState<string | null>(null);
  const [guestEmailChecked, setGuestEmailChecked] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  const [isRestoring, setIsRestoring] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [isUpdatingFulfillment, setIsUpdatingFulfillment] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const lastPricingKeyRef = useRef<string | null>(null);
  const inFlightRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);

  const isGuestFlow = searchParams.get("guest") === "1";

  useEffect(() => {
    if (!isGuestFlow) return;

    const isReload = () => {
      try {
        const nav = performance.getEntriesByType?.("navigation")?.[0] as PerformanceNavigationTiming | undefined;
        if (nav) return nav.type === "reload";
        return performance.navigation?.type === 1;
      } catch {
        return false;
      }
    };

    const handleBeforeUnload = () => {
      if (isReload()) return;
      clearGuestShippingAddress();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      clearGuestShippingAddress();
    };
  }, [isGuestFlow]);

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
    if (!isReady || !isGuestFlow) return;

    try {
      const stored = localStorage.getItem("rdk_guest_email");
      setGuestEmail(stored ? stored.trim() : null);
    } catch {
      setGuestEmail(null);
    } finally {
      setGuestEmailChecked(true);
    }
  }, [isReady, isGuestFlow]);

  useEffect(() => {
    if (isAuthenticated === null) return;
    if (isAuthenticated) return;

    if (!isGuestFlow || !guestEnabled) {
      router.push("/checkout");
    }
  }, [isAuthenticated, isGuestFlow, router]);

  useEffect(() => {
    if (!isReady) return;
    if (isAuthenticated !== false) return;
    if (!isGuestFlow || !guestEnabled) return;
    if (!guestEmailChecked) return;
    if (!guestEmail) {
      router.push("/checkout");
    }
  }, [guestEmail, guestEmailChecked, isAuthenticated, isGuestFlow, isReady, router]);

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
        setOrderId(null);
        setClientSecret(null);

        lastPricingKeyRef.current = null;
        abortRef.current?.abort();
        inFlightRef.current = false;

        return;
      }
      setIdempotencyKey(storedKey);
    } catch {
      const fallbackKey = generateIdempotencyKey();
      setIdempotencyKeyInStorage(fallbackKey);
      setIdempotencyKey(fallbackKey);
      setOrderId(null);
      setClientSecret(null);

      lastPricingKeyRef.current = null;
      abortRef.current?.abort();
      inFlightRef.current = false;
    }
  }, [isReady, items]);

  const buildShippingPayload = (address: ShippingAddress | null): ShippingPayload =>
    address
      ? {
          name: address.name?.trim() ?? "",
          phone: address.phone?.trim() ? address.phone.trim() : null,
          line1: address.line1?.trim() ?? "",
          line2: address.line2?.trim() ? address.line2.trim() : null,
          city: address.city?.trim() ?? "",
          state: address.state?.trim().toUpperCase() ?? "",
          postal_code: address.postalCode?.trim() ?? "",
          country: (address.country?.trim() ?? "US").toUpperCase(),
        }
      : null;

  const shippingPayload = useMemo(
    () => buildShippingPayload(shippingAddress),
    [shippingAddress],
  );

  const addressKey = useMemo(() => {
    if (fulfillment !== "ship" || !shippingPayload) return "pickup";
    return [
      shippingPayload.line1,
      shippingPayload.city,
      shippingPayload.state,
      shippingPayload.postal_code,
      shippingPayload.country,
    ].join("|");
  }, [fulfillment, shippingPayload?.line1, shippingPayload?.city, shippingPayload?.state, shippingPayload?.postal_code, shippingPayload?.country]);

  const cartKey = useMemo(() => buildCartSignature(items), [items]);

  const pricingKey = useMemo(() => {
    if (!orderId) return null;
    return `${orderId}:${cartKey}:${fulfillment}:${addressKey}`;
  }, [orderId, cartKey, fulfillment, addressKey]);

  useEffect(() => {
    if (!isReady || items.length === 0) return;
    if (!idempotencyKey) return;
    if (isAuthenticated === null) return;
    if (!isAuthenticated && !isGuestFlow) return;
    if (!isAuthenticated && !guestEnabled) return;
    if (!isAuthenticated && !guestEmail) return;
    if (clientSecret && orderId) return;

    let isActive = true;

    const initializeCheckout = async () => {
      setIsInitializing(true);
      setError(null);

      try {
        const response = await fetch("/api/checkout/create-payment-intent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            idempotencyKey,
            fulfillment,
            guestEmail: isAuthenticated ? undefined : (guestEmail ?? undefined),
            shippingAddress: fulfillment === "ship" ? shippingPayload : null,
            items: items.map((item) => ({
              productId: item.productId,
              variantId: item.variantId,
              quantity: item.quantity,
            })),
          }),
        });

        const data = await response.json().catch(() => null);
        if (!response.ok) {
          if (data?.code === "IDEMPOTENCY_KEY_EXPIRED" || data?.code === "CART_MISMATCH") {
            clearIdempotencyKeyFromStorage();
          }
          if (data?.code === "GUEST_EMAIL_REQUIRED" || data?.code === "GUEST_CHECKOUT_DISABLED") {
            router.push("/checkout");
            return;
          }
          throw new Error(data?.error || "Failed to start checkout");
        }

        if (!isActive) return;

        if (data?.status === "paid" && data?.orderId) {
          router.push(`/checkout/success?orderId=${data.orderId}`);
          return;
        }

        if (!data?.clientSecret || !data?.orderId) {
          throw new Error("Checkout is missing payment details.");
        }

        setOrderId(data.orderId);
        setClientSecret(data.clientSecret);
        setSubtotal(Number(data.subtotal ?? 0));
        setShipping(Number(data.shipping ?? 0));
        setTax(Number(data.tax ?? 0));
        setTotal(Number(data.total ?? 0));
        setFulfillment(data.fulfillment ?? fulfillment);

        lastPricingKeyRef.current = null;
      } catch (err: any) {
        if (!isActive) return;
        setError(err?.message ?? "Failed to start checkout.");
      } finally {
        if (isActive) setIsInitializing(false);
      }
    };

    initializeCheckout();

    return () => {
      isActive = false;
    };
  }, [
    clientSecret,
    guestEmail,
    fulfillment,
    idempotencyKey,
    isAuthenticated,
    isGuestFlow,
    isReady,
    items,
    orderId,
    router,
    shippingPayload,
  ]);

  const updatePricing = useCallback(
    async (nextFulfillment: "ship" | "pickup", nextShippingAddress: ShippingPayload, dedupeKey?: string | null) => {
      if (!orderId) return;

      if (dedupeKey && lastPricingKeyRef.current === dedupeKey) return;

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      if (inFlightRef.current) return;
      inFlightRef.current = true;

      setIsUpdatingFulfillment(true);
      setError(null);

      try {
        const response = await fetch("/api/checkout/update-fulfillment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderId,
            fulfillment: nextFulfillment,
            shippingAddress: nextShippingAddress,
          }),
          signal: controller.signal,
        });

        const data = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(data?.error || `Failed to update fulfillment (${response.status}).`);
        }

        setFulfillment(data.fulfillment ?? nextFulfillment);
        setSubtotal(Number(data.subtotal ?? 0));
        setShipping(Number(data.shipping ?? 0));
        setTax(Number(data.tax ?? 0));
        setTotal(Number(data.total ?? 0));

        if (dedupeKey) lastPricingKeyRef.current = dedupeKey;
      } catch (err: any) {
        if (dedupeKey && lastPricingKeyRef.current === dedupeKey) {
          lastPricingKeyRef.current = null;
        }
        if (err?.name !== "AbortError") {
          setError(err?.message ?? "Failed to update fulfillment.");
        }
      } finally {
        inFlightRef.current = false;
        setIsUpdatingFulfillment(false);
      }
    },
    [orderId],
  );

  useEffect(() => {
    if (fulfillment !== "ship") return;
    if (!orderId || !clientSecret) return;
    if (!pricingKey) return;
    if (isUpdatingFulfillment) return;

    if (!shippingPayload) return;
    const valid =
      shippingPayload.name.trim() !== "" &&
      shippingPayload.line1.trim() !== "" &&
      shippingPayload.city.trim() !== "" &&
      shippingPayload.state.trim() !== "" &&
      shippingPayload.postal_code.trim() !== "";

    if (!valid) return;

    if (lastPricingKeyRef.current === pricingKey) return;

    const t = setTimeout(() => {
      lastPricingKeyRef.current = pricingKey;
      updatePricing("ship", shippingPayload, pricingKey);
    }, 350);

    return () => clearTimeout(t);
  }, [
    clientSecret,
    fulfillment,
    isUpdatingFulfillment,
    orderId,
    pricingKey,
    shippingPayload,
    updatePricing,
  ]);

  const handleFulfillmentChange = async (nextFulfillment: "ship" | "pickup") => {
    if (nextFulfillment === fulfillment) return;

    lastPricingKeyRef.current = null;

    if (!orderId) {
      setFulfillment(nextFulfillment);
      return;
    }

    const nextKey =
      nextFulfillment === "ship"
        ? `${orderId}:${cartKey}:ship:${addressKey}`
        : `${orderId}:${cartKey}:pickup:pickup`;

    await updatePricing(nextFulfillment, nextFulfillment === "ship" ? shippingPayload : null, nextKey);
  };

  if (!isReady || isRestoring || items.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <Loader2 className="w-12 h-12 text-red-600 animate-spin mx-auto mb-4" />
        <p className="text-gray-400">Preparing your checkout...</p>
      </div>
    );
  }

  if (!clientSecret || !orderId || isInitializing) {
    if (error) {
      return (
        <div className="max-w-3xl mx-auto px-4 py-20 text-center">
          <div className="bg-red-900/20 border border-red-500 text-red-400 p-6 rounded">
            <p className="text-lg font-semibold mb-2">Unable to start checkout</p>
            <p className="mb-4">{error}</p>
            <button
              onClick={() => router.push("/cart")}
              className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded transition"
            >
              Return to Cart
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <Loader2 className="w-12 h-12 text-red-600 animate-spin mx-auto mb-4" />
        <p className="text-gray-400">Loading secure checkout...</p>
      </div>
    );
  }

  const elementsOptions: StripeElementsOptions = {
    clientSecret,
    appearance: stripeAppearance,
  };

  return (
    <div className="max-w-6xl mx-auto px-4 pt-0 sm:py-10 pb-28 lg:pb-10">
      <div className="flex items-center justify-between mb-6 sm:mb-8 pt-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Checkout</h1>
          <p className="text-sm sm:text-base text-gray-400">Secure checkout powered by Stripe</p>
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

      {!isAuthenticated && guestEmail && (
        <div className="mb-6 bg-zinc-900 border border-zinc-800/70 rounded p-4 text-sm text-gray-400">
          Guest checkout as <span className="text-white font-medium">{guestEmail}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <Elements stripe={stripePromise} options={elementsOptions}>
            <CheckoutForm
              orderId={orderId}
              items={items}
              total={total}
              fulfillment={fulfillment}
              shippingAddress={shippingAddress}
              onShippingAddressChange={(addr) => {
                lastPricingKeyRef.current = null;
                setShippingAddress(addr);
              }}
              onFulfillmentChange={handleFulfillmentChange}
              isUpdatingFulfillment={isUpdatingFulfillment}
              canUseChat={isAuthenticated === true}
            />
          </Elements>
        </div>

        <div className="lg:col-span-1">
          <OrderSummary
            items={items}
            subtotal={subtotal}
            shipping={shipping}
            tax={tax}
            total={total}
            fulfillment={fulfillment}
            isUpdatingShipping={isUpdatingFulfillment}
          />
        </div>
      </div>
    </div>
  );
}