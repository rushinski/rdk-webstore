"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle, Loader2, Mail } from "lucide-react";

import { useCart } from "@/components/cart/CartProvider";
import {
  calculateCheckoutDisplayTotals,
  PROCESSING_FEE_LABEL,
} from "@/lib/checkout/display-pricing";
import { clearGuestShippingAddress } from "@/lib/checkout/guest-shipping-address";
import { clearIdempotencyKeyFromStorage } from "@/lib/checkout/idempotency";
import type { OrderStatusResponse } from "@/types/domain/checkout";

const GUEST_ORDER_ID_STORAGE_KEY = "rdk_guest_order_id";
const GUEST_ORDER_TOKEN_STORAGE_KEY = "rdk_guest_order_token";

function persistGuestAccess(orderId: string, token: string) {
  try {
    sessionStorage.setItem(GUEST_ORDER_ID_STORAGE_KEY, orderId);
    sessionStorage.setItem(GUEST_ORDER_TOKEN_STORAGE_KEY, token);
  } catch {
    // sessionStorage may be unavailable
  }
}

function readStoredGuestToken(orderId: string): string | null {
  try {
    const storedOrderId = sessionStorage.getItem(GUEST_ORDER_ID_STORAGE_KEY);
    const storedToken = sessionStorage.getItem(GUEST_ORDER_TOKEN_STORAGE_KEY);
    if (storedOrderId === orderId && storedToken) {
      return storedToken;
    }
  } catch {
    // sessionStorage may be unavailable
  }
  return null;
}

function SuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { clearCart } = useCart();
  const orderId = searchParams.get("orderId");
  const tokenParam = searchParams.get("token");
  const fulfillmentParam = searchParams.get("fulfillment");
  const isPickupParam = fulfillmentParam === "pickup";

  const [accessToken, setAccessToken] = useState<string | null>(tokenParam);
  const [status, setStatus] = useState<OrderStatusResponse | null>(null);
  const [canFetchStatus, setCanFetchStatus] = useState<boolean | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasClearedRef = useRef(false);

  useEffect(() => {
    if (!orderId) {
      router.push("/cart");
      return;
    }

    clearIdempotencyKeyFromStorage();
    clearGuestShippingAddress();

    if (!hasClearedRef.current) {
      hasClearedRef.current = true;
      clearCart();
    }
  }, [orderId, router, clearCart]);

  useEffect(() => {
    if (!orderId) {
      return;
    }

    const resolvedToken = tokenParam ?? readStoredGuestToken(orderId);
    if (resolvedToken) {
      persistGuestAccess(orderId, resolvedToken);
    }
    setAccessToken(resolvedToken ?? null);
  }, [orderId, tokenParam]);

  useEffect(() => {
    if (accessToken) {
      setCanFetchStatus(true);
      return;
    }

    const loadSession = async () => {
      try {
        const response = await fetch("/api/auth/session", { cache: "no-store" });
        const data = await response.json().catch(() => null);
        const hasUser = Boolean(data?.user);
        setIsAuthenticated(hasUser);
        setCanFetchStatus(hasUser);
      } catch {
        setCanFetchStatus(false);
      }
    };

    void loadSession();
  }, [accessToken]);

  useEffect(() => {
    if (!orderId || !canFetchStatus) {
      return;
    }

    let pollInterval: NodeJS.Timeout;
    let timeoutId: NodeJS.Timeout;

    const pollOrderStatus = async () => {
      try {
        const tokenQuery = accessToken ? `?token=${encodeURIComponent(accessToken)}` : "";
        const response = await fetch(`/api/orders/${orderId}${tokenQuery}`, {
          cache: "no-store",
        });

        const data = await response.json().catch(() => null);
        if (!response.ok) {
          if (data?.error === "Unauthorized") {
            setCanFetchStatus(false);
            return;
          }
          throw new Error(data?.error || "Failed to fetch order status");
        }

        setStatus(data);

        if (data?.status === "paid" || data?.status === "processing") {
          setIsPolling(false);
          clearInterval(pollInterval);
          clearTimeout(timeoutId);
        }
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Failed to fetch order status";
        setError(message);
        setIsPolling(false);
        clearInterval(pollInterval);
        clearTimeout(timeoutId);
      }
    };

    setIsPolling(true);
    void pollOrderStatus();

    pollInterval = setInterval(() => {
      void pollOrderStatus();
    }, 2000);
    timeoutId = setTimeout(() => {
      setIsPolling(false);
      clearInterval(pollInterval);
    }, 60000);

    return () => {
      clearInterval(pollInterval);
      clearTimeout(timeoutId);
    };
  }, [accessToken, canFetchStatus, orderId]);

  if (!orderId) {
    return null;
  }

  if (error) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <div className="border border-red-200 bg-red-50 p-6 text-red-700">
          <p className="mb-2 text-lg font-semibold uppercase tracking-[0.08em]">Error</p>
          <p>{error}</p>
          <button
            onClick={() => router.push("/cart")}
            className="mt-4 border border-brand-text bg-brand-text px-6 py-3 text-sm font-semibold uppercase tracking-[0.08em] text-brand-surface transition-colors hover:bg-neutral-800"
          >
            Return to cart
          </button>
        </div>
      </div>
    );
  }

  if (canFetchStatus === false) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <Mail className="mx-auto mb-6 h-16 w-16 text-brand-text" />
        <h1 className="mb-4 text-3xl font-black uppercase tracking-[0.08em] text-brand-text">
          Order confirmed
        </h1>
        <p className="mb-6 text-brand-muted">
          Your order was submitted. We could not load the full order details on this
          device, but we will email your confirmation and secure order link shortly.
        </p>
        {isPickupParam && (
          <div className="mb-6 border border-brand-border bg-brand-surface p-6 text-left">
            <h2 className="mb-2 text-lg font-semibold uppercase tracking-[0.08em] text-brand-text">
              Local pickup
            </h2>
            <p className="mb-2 text-sm text-brand-muted">
              Check your email for pickup instructions and scheduling.
            </p>
            <p className="text-sm text-brand-muted">
              You can also DM us on Instagram{" "}
              <a
                href="mailto:null@gmail.com"
                className="font-semibold text-brand-text transition-colors hover:text-neutral-600"
                target="_blank"
                rel="noreferrer"
              >
                null@gmail.com
              </a>{" "}
              to schedule pickup.
            </p>
          </div>
        )}
        <p className="mb-6 text-xs text-brand-muted">Order ID: {orderId}</p>
        <button
          onClick={() => router.push("/store")}
          className="w-full border border-brand-text bg-brand-text py-3 text-sm font-bold uppercase tracking-[0.08em] text-brand-surface transition-colors hover:bg-neutral-800"
        >
          Continue shopping
        </button>
      </div>
    );
  }

  if (isPolling || !status || !["paid", "processing"].includes(status.status)) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <Loader2 className="mx-auto mb-6 h-16 w-16 animate-spin text-brand-text" />
        <h1 className="mb-4 text-3xl font-black uppercase tracking-[0.08em] text-brand-text">
          Finalizing your order
        </h1>
        <p className="mb-8 text-brand-muted">
          Please wait while we load your order details. This should only take a moment.
        </p>
        {status && (
          <div className="border border-brand-border bg-brand-surface p-6 text-left">
            <div className="mb-2 flex justify-between text-brand-muted">
              <span>Order ID:</span>
              <span className="font-mono text-sm text-brand-text">{status.id}</span>
            </div>
            <div className="flex justify-between text-brand-muted">
              <span>Status:</span>
              <span className="capitalize text-brand-text">{status.status}</span>
            </div>
          </div>
        )}
      </div>
    );
  }

  const isPickup = status.fulfillment === "pickup" || isPickupParam;
  const { processingFee, displayTotal } = calculateCheckoutDisplayTotals({
    subtotal: status.subtotal,
    shipping: status.shipping,
    tax: status.tax,
    fulfillment: status.fulfillment,
  });

  return (
    <div className="mx-auto max-w-2xl px-4 py-20 text-center">
      <CheckCircle className="mx-auto mb-6 h-16 w-16 text-brand-text" />
      <h1 className="mb-4 text-3xl font-black uppercase tracking-[0.08em] text-brand-text">
        Order confirmed
      </h1>
      <p className="mb-8 text-brand-muted">
        Thank you for your order. Your submission has been received successfully.
      </p>

      <div className="mb-6 border border-brand-border bg-brand-surface p-6 text-left">
        <h2 className="mb-4 text-xl font-semibold uppercase tracking-[0.08em] text-brand-text">
          Order details
        </h2>
        <div className="space-y-2 text-brand-muted">
          <div className="flex justify-between">
            <span>Order ID:</span>
            <span className="font-mono text-sm text-brand-text">{status.id}</span>
          </div>
          <div className="flex justify-between">
            <span>Subtotal:</span>
            <span className="text-brand-text">${status.subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>Shipping:</span>
            <span className="text-brand-text">
              {status.fulfillment === "pickup"
                ? "Free (Pickup)"
                : `$${status.shipping.toFixed(2)}`}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Tax:</span>
            <span className="text-brand-text">${status.tax.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>Processing fee ({PROCESSING_FEE_LABEL}):</span>
            <span className="text-brand-text">${processingFee.toFixed(2)}</span>
          </div>
          <div className="mt-2 border-t border-brand-border pt-2">
            <div className="flex justify-between text-xl font-bold">
              <span className="text-brand-text">Total:</span>
              <span className="text-brand-text">${displayTotal.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {isPickup && (
        <div className="mb-6 border border-brand-border bg-brand-surface p-6 text-left">
          <h2 className="mb-2 text-lg font-semibold uppercase tracking-[0.08em] text-brand-text">
            Local pickup
          </h2>
          <p className="mb-2 text-sm text-brand-muted">
            Check your email for pickup instructions and scheduling.
          </p>
          <p className="mb-2 text-sm text-brand-muted">
            You can also reach us at{" "}
            <a
              href="mailto:null@gmail.com"
              className="font-semibold text-brand-text transition-colors hover:text-neutral-600"
              target="_blank"
              rel="noreferrer"
            >
              null@gmail.com
            </a>
            .
          </p>
        </div>
      )}

      <div className="space-y-3">
        {isAuthenticated && (
          <button
            onClick={() => router.push("/account")}
            className="w-full border border-brand-text bg-brand-text py-3 text-sm font-bold uppercase tracking-[0.08em] text-brand-surface transition-colors hover:bg-neutral-800"
          >
            Go to account
          </button>
        )}
        <button
          onClick={() => router.push("/store")}
          className="w-full border border-brand-border bg-brand-surface py-3 text-sm font-semibold uppercase tracking-[0.08em] text-brand-text transition-colors hover:border-brand-text hover:bg-brand-page"
        >
          Continue shopping
        </button>
      </div>
    </div>
  );
}

export function CheckoutSuccessPageContent() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-2xl px-4 py-20 text-center">
          <Loader2 className="mx-auto h-16 w-16 animate-spin text-brand-text" />
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}
