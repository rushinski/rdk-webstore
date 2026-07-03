"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
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
import { normalizeCountryCode, normalizeUsStateCode } from "@/lib/address/codes";
import { calculateCheckoutDisplayTotals } from "@/lib/checkout/display-pricing";

const guestEnabled = clientEnv.NEXT_PUBLIC_GUEST_CHECKOUT_ENABLED === "true";

const buildCartSignature = (items: CartItem[]) => {
  const sorted = [...items].sort((a, b) =>
    `${a.productId}:${a.variantId}`.localeCompare(`${b.productId}:${b.variantId}`),
  );
  return JSON.stringify(
    sorted.map((item) => ({
      productId: item.productId,
      variantId: item.variantId,
      quantity: item.quantity,
    })),
  );
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

  const [idempotencyKey, setIdempotencyKey] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);

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

  useEffect(() => {
    if (items.length > 0 && subtotal === 0) {
      const calculatedSubtotal = items.reduce(
        (sum, item) => sum + (item.priceCents * item.quantity) / 100,
        0,
      );
      setSubtotal(calculatedSubtotal);
      setTotal(calculatedSubtotal);
    }
  }, [items, subtotal]);

  useEffect(() => {
    if (!isGuestFlow) {
      return;
    }

    return () => {
      clearGuestShippingAddress();
    };
  }, [isGuestFlow]);

  useEffect(() => {
    fetch("/api/auth/session", { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => setIsAuthenticated(Boolean(data?.user)))
      .catch(() => setIsAuthenticated(false));
  }, []);

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

  useEffect(() => {
    if (isAuthenticated === null) {
      return;
    }

    if (!isAuthenticated && (!isGuestFlow || !guestEnabled)) {
      router.push("/checkout");
    }
  }, [isAuthenticated, isGuestFlow, router]);

  useEffect(() => {
    if (!isReady || items.length === 0) {
      return;
    }

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
        lastPricingKeyRef.current = null;
        return;
      }

      setIdempotencyKey(storedKey);
    } catch {
      const nextKey = generateIdempotencyKey();
      setIdempotencyKeyInStorage(nextKey);
      setIdempotencyKey(nextKey);
    }
  }, [isReady, items]);

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
      state: normalizeUsStateCode(shippingAddress.state),
      postal_code: shippingAddress.postal_code?.trim() ?? "",
      country: normalizeCountryCode(shippingAddress.country, "US"),
    };
  }, [shippingAddress]);

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
    if (orderId) {
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
          items: items.map((item) => ({
            productId: item.productId,
            variantId: item.variantId,
            quantity: item.quantity,
          })),
        };

        if (!isAuthenticated && guestEmail) {
          payload.guestEmail = guestEmail;
        }

        const response = await fetch("/api/checkout/init-checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const data = await response.json().catch(() => null);
        if (!response.ok) {
          if (
            data?.code === "IDEMPOTENCY_KEY_EXPIRED" ||
            data?.code === "CART_MISMATCH"
          ) {
            clearIdempotencyKeyFromStorage();
            const nextKey = generateIdempotencyKey();
            setIdempotencyKeyInStorage(nextKey);
            setIdempotencyKey(nextKey);
            setOrderId(null);
            return;
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

        setOrderId(data.orderId);
        setSubtotal(Number(data.subtotal ?? 0));
        setShipping(Number(data.shipping ?? 0));
        setTax(Number(data.tax ?? 0));
        setTotal(Number(data.total ?? 0));
        setFulfillment(data.fulfillment ?? fulfillment);
        lastPricingKeyRef.current = null;
      } catch (error: unknown) {
        if (active) {
          setError(error instanceof Error ? error.message : "Failed to start checkout");
        }
      } finally {
        if (active) {
          setIsInitializing(false);
        }
      }
    };

    void init();
    return () => {
      active = false;
    };
  }, [
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
  }, [addressKey, fulfillment, orderId]);

  const updatePricing = useCallback(
    async (
      nextFulfillment: "ship" | "pickup",
      nextAddress: ShippingPayload,
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
        const response = await fetch("/api/checkout/update-fulfillment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderId,
            fulfillment: nextFulfillment,
            shippingAddress: nextAddress,
          }),
          signal: controller.signal,
        });
        const data = await response.json().catch(() => null);
        if (!response.ok) {
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
      } catch (error: unknown) {
        if (dedupeKey) {
          lastPricingKeyRef.current = null;
        }
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setError(error instanceof Error ? error.message : "Failed to update fulfillment");
        }
      } finally {
        inFlightRef.current = false;
        setIsUpdatingFulfillment(false);
      }
    },
    [orderId],
  );

  useEffect(() => {
    if (
      fulfillment !== "ship" ||
      !orderId ||
      !pricingKey ||
      isUpdatingFulfillment ||
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

    const timeoutId = setTimeout(() => {
      lastPricingKeyRef.current = pricingKey;
      void updatePricing("ship", shippingPayload, pricingKey);
    }, 350);

    return () => clearTimeout(timeoutId);
  }, [
    fulfillment,
    isUpdatingFulfillment,
    orderId,
    pricingKey,
    shippingPayload,
    updatePricing,
  ]);

  const handleFulfillmentChange = async (nextFulfillment: "ship" | "pickup") => {
    if (nextFulfillment === fulfillment) {
      return;
    }
    lastPricingKeyRef.current = null;
    if (!orderId) {
      setFulfillment(nextFulfillment);
      return;
    }
    await updatePricing(
      nextFulfillment,
      nextFulfillment === "ship" ? shippingPayload : null,
    );
  };

  if (!isReady || isRestoring || items.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <div className="border border-brand-border bg-brand-surface p-10 shadow-[0_24px_80px_rgba(17,17,17,0.08)]">
          <Loader2 className="mx-auto mb-4 h-12 w-12 animate-spin text-brand-text" />
          <p className="text-sm font-semibold uppercase tracking-[0.08em] text-brand-text">
            Preparing your checkout...
          </p>
        </div>
      </div>
    );
  }

  if (!orderId || isInitializing) {
    if (error) {
      return (
        <div className="mx-auto max-w-3xl px-4 py-20 text-center">
          <div className="border border-red-300 bg-red-50 p-6 text-red-900">
            <p className="mb-2 text-lg font-semibold uppercase tracking-[0.08em] text-red-700">
              Unable to start checkout
            </p>
            <p className="mb-4">{error}</p>
            <button
              onClick={() => router.push("/cart")}
              className="border border-brand-text bg-brand-text px-6 py-3 text-sm font-semibold uppercase tracking-[0.08em] text-brand-page transition hover:bg-white"
            >
              Return to Cart
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <div className="border border-brand-border bg-brand-surface p-10 shadow-[0_24px_80px_rgba(17,17,17,0.08)]">
          <Loader2 className="mx-auto mb-4 h-12 w-12 animate-spin text-brand-text" />
          <p className="text-sm font-semibold uppercase tracking-[0.08em] text-brand-text">
            Loading checkout...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 pb-28 pt-0 sm:py-10 lg:pb-10">
      <div className="mb-6 flex items-center justify-between border-b border-brand-border pb-6 pt-2 sm:mb-8">
        <div>
          <h1 className="text-2xl font-bold uppercase tracking-[0.08em] text-brand-text sm:text-3xl">
            Checkout
          </h1>
          <p className="text-sm text-brand-muted sm:text-base">Review and submit</p>
        </div>
        <Link
          href="/cart"
          className="text-sm font-semibold uppercase tracking-[0.08em] text-brand-text transition-colors hover:text-neutral-600"
        >
          Back to cart
        </Link>
      </div>

      {error && (
        <div className="mb-6 border border-red-300 bg-red-50 p-4 text-red-900">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <CheckoutForm
            orderId={orderId}
            items={items}
            displayTotal={
              calculateCheckoutDisplayTotals({
                subtotal,
                shipping,
                tax,
                fulfillment,
              }).displayTotal
            }
            fulfillment={fulfillment}
            shippingAddress={shippingAddress}
            onShippingAddressChange={(address) => {
              lastPricingKeyRef.current = null;
              setShippingAddress(address);
            }}
            onFulfillmentChange={(nextFulfillment: "ship" | "pickup") => {
              void handleFulfillmentChange(nextFulfillment);
            }}
            isUpdatingFulfillment={isUpdatingFulfillment}
            guestEmail={guestEmail}
            onGuestEmailChange={setGuestEmail}
            isGuestCheckout={isGuestFlow}
          />
        </div>
        <div className="lg:col-span-1">
          <OrderSummary
            items={items}
            subtotal={subtotal}
            shipping={shipping}
            tax={tax}
            fulfillment={fulfillment}
            isUpdatingShipping={isUpdatingFulfillment}
          />
        </div>
      </div>
    </div>
  );
}
