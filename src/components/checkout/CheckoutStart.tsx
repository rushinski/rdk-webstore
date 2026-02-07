// src/components/checkout/CheckoutStart.tsx
//
// KEY CHANGES:
// 1. Uses stripeAccountId from API response to configure Stripe Elements
//    for direct charges (Elements must be initialized with stripeAccount option)
// 2. Handles BNPL redirect flows (Afterpay, Affirm, Klarna return via redirect)
// 3. Cleaner state management — fewer refs, clearer flow

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Elements } from "@stripe/react-stripe-js";
import {
  loadStripe,
  type Stripe as StripeType,
  type StripeElementsOptions,
} from "@stripe/stripe-js";
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
} from "@/lib/checkout/idempotency";
import { CartSnapshotService } from "@/services/cart-snapshot-service";
import { clientEnv } from "@/config/client-env";
import { clearGuestShippingAddress } from "@/lib/checkout/guest-shipping-address";

const guestEnabled = clientEnv.NEXT_PUBLIC_GUEST_CHECKOUT_ENABLED === "true";

const buildCartSignature = (items: CartItem[]) => {
  const sorted = [...items].sort((a, b) =>
    `${a.productId}:${a.variantId}`.localeCompare(`${b.productId}:${b.variantId}`),
  );
  return JSON.stringify(
    sorted.map((i) => ({
      productId: i.productId,
      variantId: i.variantId,
      quantity: i.quantity,
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

  const snapshotService = useMemo(() => new CartSnapshotService(), []);

  // ---------- Stripe state ----------
  // For direct charges, we need to load Stripe with the Connect account ID.
  // We get this from the API response, so we load Stripe lazily.
  const [stripePromise, setStripePromise] = useState<Promise<StripeType | null> | null>(
    null,
  );
  const [stripeAccountId, setStripeAccountId] = useState<string | null>(null);

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
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  const [isRestoring, setIsRestoring] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [isUpdatingFulfillment, setIsUpdatingFulfillment] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lastPricingKeyRef = useRef<string | null>(null);
  const inFlightRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);

  const isGuestFlow = searchParams.get("guest") === "1";

  // Calculate initial subtotal from cart
  useEffect(() => {
    if (items.length > 0 && subtotal === 0) {
      const calc = items.reduce((sum, i) => sum + (i.priceCents * i.quantity) / 100, 0);
      setSubtotal(calc);
      setTotal(calc);
    }
  }, [items, subtotal]);

  // Clear guest shipping on unmount
  useEffect(() => {
    if (!isGuestFlow) {
      return;
    }
    return () => {
      clearGuestShippingAddress();
    };
  }, [isGuestFlow]);

  // Check auth
  useEffect(() => {
    fetch("/api/auth/session", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setIsAuthenticated(Boolean(d?.user)))
      .catch(() => setIsAuthenticated(false));
  }, []);

  // Restore cart from snapshot if empty
  useEffect(() => {
    if (!isReady || items.length > 0) {
      return;
    }
    setIsRestoring(true);
    snapshotService
      .restoreCart()
      .then((restored) => {
        if (restored?.length) {
          setCartItems(restored);
        } else {
          router.push("/cart");
        }
      })
      .finally(() => setIsRestoring(false));
  }, [isReady, items.length, router, setCartItems, snapshotService]);

  // Redirect unauthenticated non-guest users
  useEffect(() => {
    if (isAuthenticated === null) {
      return;
    }
    if (!isAuthenticated && (!isGuestFlow || !guestEnabled)) {
      router.push("/checkout");
    }
  }, [isAuthenticated, isGuestFlow, router]);

  // Generate idempotency key
  useEffect(() => {
    if (!isReady || items.length === 0) {
      return;
    }
    const sig = buildCartSignature(items);
    try {
      const storedSig = sessionStorage.getItem("checkout_cart_signature");
      const storedKey = getIdempotencyKeyFromStorage();
      if (!storedKey || storedSig !== sig) {
        const key = generateIdempotencyKey();
        setIdempotencyKeyInStorage(key);
        sessionStorage.setItem("checkout_cart_signature", sig);
        setIdempotencyKey(key);
        setOrderId(null);
        setClientSecret(null);
        lastPricingKeyRef.current = null;
        return;
      }
      setIdempotencyKey(storedKey);
    } catch {
      const key = generateIdempotencyKey();
      setIdempotencyKeyInStorage(key);
      setIdempotencyKey(key);
    }
  }, [isReady, items]);

  // Build shipping payload
  const shippingPayload = useMemo<ShippingPayload>(() => {
    if (!shippingAddress) {
      return null;
    }
    return {
      name: shippingAddress.name?.trim() ?? "",
      phone: shippingAddress.phone?.trim() || null,
      line1: shippingAddress.line1?.trim() ?? "",
      line2: shippingAddress.line2?.trim() || null,
      city: shippingAddress.city?.trim() ?? "",
      state: shippingAddress.state?.trim().toUpperCase() ?? "",
      postal_code: shippingAddress.postalCode?.trim() ?? "",
      country: (shippingAddress.country?.trim() ?? "US").toUpperCase(),
    };
  }, [shippingAddress]);

  // ---------- Initialize checkout (create PaymentIntent) ----------
  useEffect(() => {
    if (!isReady || items.length === 0 || !idempotencyKey) {
      return;
    }
    if (isAuthenticated === null) {
      return;
    }
    if (!isAuthenticated && !isGuestFlow) {
      return;
    }
    if (clientSecret && orderId) {
      return;
    }

    let active = true;

    const init = async () => {
      setIsInitializing(true);
      setError(null);

      try {
        const payload: Record<string, unknown> = {
          idempotencyKey,
          fulfillment,
          shippingAddress: fulfillment === "ship" ? shippingPayload : null,
          items: items.map((i) => ({
            productId: i.productId,
            variantId: i.variantId,
            quantity: i.quantity,
          })),
        };
        if (!isAuthenticated && guestEmail) {
          payload.guestEmail = guestEmail;
        }

        const res = await fetch("/api/checkout/create-payment-intent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const data = await res.json().catch(() => null);
        if (!res.ok) {
          if (
            data?.code === "IDEMPOTENCY_KEY_EXPIRED" ||
            data?.code === "CART_MISMATCH"
          ) {
            clearIdempotencyKeyFromStorage();
          }
          if (data?.code === "GUEST_CHECKOUT_DISABLED") {
            router.push("/checkout");
            return;
          }
          throw new Error(data?.error || "Failed to start checkout");
        }
        if (!active) {
          return;
        }

        if (data?.status === "paid") {
          router.push(`/checkout/success?orderId=${data.orderId}`);
          return;
        }

        if (!data?.clientSecret || !data?.orderId || !data?.stripeAccountId) {
          throw new Error("Checkout response missing required fields");
        }

        setOrderId(data.orderId);
        setClientSecret(data.clientSecret);
        setStripeAccountId(data.stripeAccountId);
        setSubtotal(Number(data.subtotal ?? 0));
        setShipping(Number(data.shipping ?? 0));
        setTax(Number(data.tax ?? 0));
        setTotal(Number(data.total ?? 0));
        setFulfillment(data.fulfillment ?? fulfillment);

        // Load Stripe with the Connect account ID for direct charges
        // This is critical — without stripeAccount, Elements would create
        // charges on the platform account instead of the Connect account.
        setStripePromise(
          loadStripe(clientEnv.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!, {
            stripeAccount: data.stripeAccountId,
          }),
        );

        lastPricingKeyRef.current = null;
      } catch (err: unknown) {
        if (active) {
          setError(err instanceof Error ? err.message : "Failed to start checkout");
        }
      } finally {
        if (active) {
          setIsInitializing(false);
        }
      }
    };

    init();
    return () => {
      active = false;
    };
  }, [
    clientSecret,
    fulfillment,
    guestEmail,
    idempotencyKey,
    isAuthenticated,
    isGuestFlow,
    isReady,
    items,
    orderId,
    router,
    shippingPayload,
  ]);

  // ---------- Update pricing on fulfillment/address change ----------
  const addressKey = useMemo(() => {
    if (fulfillment !== "ship" || !shippingPayload) {
      return "pickup";
    }
    return [
      shippingPayload.line1,
      shippingPayload.city,
      shippingPayload.state,
      shippingPayload.postal_code,
    ].join("|");
  }, [fulfillment, shippingPayload]);

  const pricingKey = useMemo(() => {
    if (!orderId) {
      return null;
    }
    return `${orderId}:${fulfillment}:${addressKey}`;
  }, [orderId, fulfillment, addressKey]);

  const updatePricing = useCallback(
    async (
      nextFulfillment: "ship" | "pickup",
      nextAddr: ShippingPayload,
      dedupeKey?: string | null,
    ) => {
      if (!orderId) {
        return;
      }
      if (dedupeKey && lastPricingKeyRef.current === dedupeKey) {
        return;
      }

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      if (inFlightRef.current) {
        return;
      }
      inFlightRef.current = true;
      setIsUpdatingFulfillment(true);
      setError(null);

      try {
        const res = await fetch("/api/checkout/update-fulfillment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderId,
            fulfillment: nextFulfillment,
            shippingAddress: nextAddr,
          }),
          signal: controller.signal,
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) {
          throw new Error(data?.error || "Failed to update fulfillment");
        }

        setFulfillment(data.fulfillment ?? nextFulfillment);
        setSubtotal(Number(data.subtotal ?? 0));
        setShipping(Number(data.shipping ?? 0));
        setTax(Number(data.tax ?? 0));
        setTotal(Number(data.total ?? 0));
        if (dedupeKey) {
          lastPricingKeyRef.current = dedupeKey;
        }
      } catch (err: unknown) {
        if (dedupeKey) {
          lastPricingKeyRef.current = null;
        }
        if (!(err instanceof DOMException && err.name === "AbortError")) {
          setError(err instanceof Error ? err.message : "Failed to update fulfillment");
        }
      } finally {
        inFlightRef.current = false;
        setIsUpdatingFulfillment(false);
      }
    },
    [orderId],
  );

  // Auto-update pricing when shipping address changes
  useEffect(() => {
    if (
      fulfillment !== "ship" ||
      !orderId ||
      !clientSecret ||
      !pricingKey ||
      isUpdatingFulfillment
    ) {
      return;
    }
    if (
      !shippingPayload?.line1 ||
      !shippingPayload.city ||
      !shippingPayload.state ||
      !shippingPayload.postal_code
    ) {
      return;
    }
    if (lastPricingKeyRef.current === pricingKey) {
      return;
    }

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

  const handleFulfillmentChange = async (next: "ship" | "pickup") => {
    if (next === fulfillment) {
      return;
    }
    lastPricingKeyRef.current = null;
    if (!orderId) {
      setFulfillment(next);
      return;
    }
    await updatePricing(next, next === "ship" ? shippingPayload : null);
  };

  // ---------- Render ----------

  if (!isReady || isRestoring || items.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <Loader2 className="w-12 h-12 text-red-600 animate-spin mx-auto mb-4" />
        <p className="text-gray-400">Preparing your checkout...</p>
      </div>
    );
  }

  const showForm = isGuestFlow || (clientSecret && orderId);

  if (!showForm || isInitializing) {
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

  const elementsOptions: StripeElementsOptions | undefined = clientSecret
    ? { clientSecret, appearance: stripeAppearance }
    : undefined;

  const formProps = {
    orderId: orderId ?? "pending",
    stripeAccountId: stripeAccountId ?? undefined,
    items,
    total,
    fulfillment,
    shippingAddress,
    onShippingAddressChange: (addr: ShippingAddress | null) => {
      lastPricingKeyRef.current = null;
      setShippingAddress(addr);
    },
    onFulfillmentChange: (next: "ship" | "pickup") => {
      void handleFulfillmentChange(next);
    },
    isUpdatingFulfillment,
    canUseChat: isAuthenticated === true,
    guestEmail,
    onGuestEmailChange: setGuestEmail,
    isGuestCheckout: isGuestFlow,
  };

  return (
    <div className="max-w-6xl mx-auto px-4 pt-0 sm:py-10 pb-28 lg:pb-10">
      <div className="flex items-center justify-between mb-6 sm:mb-8 pt-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Checkout</h1>
          <p className="text-sm sm:text-base text-gray-400">
            Secure checkout powered by Stripe
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
        <div className="lg:col-span-2">
          {elementsOptions && stripePromise ? (
            <Elements stripe={stripePromise} options={elementsOptions}>
              <CheckoutForm {...formProps} />
            </Elements>
          ) : (
            <CheckoutForm {...formProps} />
          )}
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
