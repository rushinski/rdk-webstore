// app/checkout/success/page.tsx
"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CheckCircle, Loader2, Mail } from "lucide-react";
import { clearIdempotencyKeyFromStorage } from "@/lib/idempotency";
import type { OrderStatusResponse } from "@/types/views/checkout";
import { useCart } from "@/components/cart/CartProvider";

function SuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { clearCart } = useCart();
  const orderId = searchParams.get("orderId");
  const accessToken = searchParams.get("token");

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

    if (!hasClearedRef.current) {
      hasClearedRef.current = true;
      clearCart();
    }
  }, [orderId, router, clearCart]);

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

    loadSession();
  }, [accessToken]);

  useEffect(() => {
    if (!orderId || !canFetchStatus) return;

    let pollInterval: NodeJS.Timeout;
    let timeoutId: NodeJS.Timeout;

    const pollOrderStatus = async () => {
      try {
        const tokenQuery = accessToken ? `?token=${encodeURIComponent(accessToken)}` : "";
        const response = await fetch(`/api/orders/${orderId}${tokenQuery}`, { cache: "no-store" });

        const data = await response.json().catch(() => null);
        if (!response.ok) {
          if (data?.error === "Unauthorized") {
            setCanFetchStatus(false);
            return;
          }
          throw new Error(data?.error || "Failed to fetch order status");
        }

        setStatus(data);

        if (data?.status === "paid") {
          setIsPolling(false);
          clearInterval(pollInterval);
          clearTimeout(timeoutId);
        }
      } catch (err: any) {
        setError(err.message || "Failed to fetch order status");
        setIsPolling(false);
        clearInterval(pollInterval);
        clearTimeout(timeoutId);
      }
    };

    setIsPolling(true);
    pollOrderStatus();

    pollInterval = setInterval(pollOrderStatus, 2000);
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
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="bg-red-900/20 border border-red-500 text-red-400 p-6 rounded">
          <p className="text-lg font-semibold mb-2">Error</p>
          <p>{error}</p>
          <button
            onClick={() => router.push("/cart")}
            className="mt-4 px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded transition"
          >
            Return to Cart
          </button>
        </div>
      </div>
    );
  }

  if (canFetchStatus === false) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <Mail className="w-16 h-16 text-red-600 mx-auto mb-6" />
        <h1 className="text-3xl font-bold text-white mb-4">Order received</h1>
        <p className="text-gray-400 mb-6">
          Thanks for your purchase. We are finalizing your order and will email a secure order
          status link shortly.
        </p>
        <p className="text-xs text-zinc-500 mb-6">Order ID: {orderId}</p>
        <button
          onClick={() => router.push("/store")}
          className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded transition"
        >
          Continue Shopping
        </button>
      </div>
    );
  }

  if (isPolling || !status || status.status !== "paid") {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <Loader2 className="w-16 h-16 text-red-600 mx-auto mb-6 animate-spin" />
        <h1 className="text-3xl font-bold text-white mb-4">Processing your payment...</h1>
        <p className="text-gray-400 mb-8">
          Please wait while we confirm your order. This should only take a moment.
        </p>
        {status && (
          <div className="bg-zinc-900 border border-zinc-800/70 rounded p-6 text-left">
            <div className="flex justify-between text-gray-400 mb-2">
              <span>Order ID:</span>
              <span className="text-white font-mono text-sm">{status.id}</span>
            </div>
            <div className="flex justify-between text-gray-400">
              <span>Status:</span>
              <span className="text-yellow-500 capitalize">{status.status}</span>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-20 text-center">
      <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-6" />
      <h1 className="text-3xl font-bold text-white mb-4">Order Confirmed!</h1>
      <p className="text-gray-400 mb-8">
        Thank you for your purchase. Your order has been successfully processed.
      </p>

      <div className="bg-zinc-900 border border-zinc-800/70 rounded p-6 mb-6 text-left">
        <h2 className="text-xl font-semibold text-white mb-4">Order Details</h2>
        <div className="space-y-2 text-gray-400">
          <div className="flex justify-between">
            <span>Order ID:</span>
            <span className="text-white font-mono text-sm">{status.id}</span>
          </div>
          <div className="flex justify-between">
            <span>Subtotal:</span>
            <span className="text-white">${status.subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>Shipping:</span>
            <span className="text-white">
              {status.fulfillment === "pickup" ? "Free (Pickup)" : `$${status.shipping.toFixed(2)}`}
            </span>
          </div>
          <div className="border-t border-zinc-800/70 pt-2 mt-2">
            <div className="flex justify-between text-xl font-bold">
              <span className="text-white">Total:</span>
              <span className="text-white">${status.total.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {isAuthenticated && status.fulfillment === "pickup" && (
          <button
            onClick={() => window.dispatchEvent(new CustomEvent("openChat"))}
            className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-semibold py-3 rounded transition"
          >
            Open pickup chat
          </button>
        )}
        {isAuthenticated && (
          <button
            onClick={() => router.push("/account")}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded transition"
          >
            Go to Account
          </button>
        )}
        <button
          onClick={() => router.push("/store")}
          className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-semibold py-3 rounded transition"
        >
          Continue Shopping
        </button>
      </div>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-2xl mx-auto px-4 py-20 text-center">
          <Loader2 className="w-16 h-16 text-red-600 mx-auto animate-spin" />
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}
