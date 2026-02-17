// src/app/checkout/processing/page.tsx

"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";

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

export default function CheckoutProcessingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"processing" | "success" | "error">("processing");
  const [message, setMessage] = useState("Processing your payment...");
  const hasCalledConfirm = useRef(false);

  const orderId = searchParams.get("orderId");
  const paymentIntentId = searchParams.get("payment_intent");
  const redirectStatus = searchParams.get("redirect_status");
  const fulfillment = searchParams.get("fulfillment") || "ship";
  const tokenParam = searchParams.get("token");
  const [guestToken, setGuestToken] = useState<string | null>(tokenParam);

  useEffect(() => {
    if (!orderId) {
      return;
    }

    const resolvedToken = tokenParam ?? readStoredGuestToken(orderId);
    if (resolvedToken) {
      persistGuestAccess(orderId, resolvedToken);
    }
    setGuestToken(resolvedToken ?? null);
  }, [orderId, tokenParam]);

  useEffect(() => {
    if (!orderId) {
      router.push("/cart");
      return;
    }

    // 1. Handle Redirect Return (Affirm, Afterpay, etc.)
    if (redirectStatus === "succeeded" && paymentIntentId && !hasCalledConfirm.current) {
      hasCalledConfirm.current = true;

      const confirmPayment = async () => {
        try {
          setMessage("Confirming your payment...");

          // Recover guest email saved before the Affirm/BNPL redirect
          let guestEmail: string | undefined;
          try {
            guestEmail = sessionStorage.getItem("checkout_guest_email") ?? undefined;
          } catch {
            // sessionStorage may be unavailable
          }

          const res = await fetch("/api/checkout/confirm-payment", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              orderId,
              paymentIntentId,
              fulfillment: fulfillment as "ship" | "pickup",
              guestEmail,
            }),
          });

          const data = await res.json();

          if (!res.ok) {
            throw new Error(data.error || "Payment confirmation failed");
          }

          if (data.processing || data.success) {
            const returnedToken =
              typeof data.guestAccessToken === "string" && data.guestAccessToken.trim()
                ? data.guestAccessToken
                : null;
            if (returnedToken) {
              persistGuestAccess(orderId, returnedToken);
              setGuestToken(returnedToken);
            }

            setMessage("Payment confirmed. Finalizing your order...");
            // Clean up stored guest email after successful confirmation
            try {
              sessionStorage.removeItem("checkout_guest_email");
            } catch {
              // non-fatal
            }
            startPolling(returnedToken ?? readStoredGuestToken(orderId));
          } else {
            throw new Error("Unexpected response from server");
          }
        } catch (error) {
          console.error("Payment confirmation error:", error);
          setStatus("error");
          setMessage(
            error instanceof Error
              ? error.message
              : "Failed to confirm payment. Please contact support.",
          );
        }
      };

      confirmPayment();
      return;
    }

    // 2. Handle Direct Arrival (Standard flow, if applicable)
    if (!redirectStatus) {
      // Note: If arriving here without a token in URL or state for a guest,
      // polling might fail unless the user is logged in.
      startPolling(tokenParam ?? readStoredGuestToken(orderId));
    }
  }, [orderId, paymentIntentId, redirectStatus, fulfillment, tokenParam, router]);

  const startPolling = (explicitToken?: string | null) => {
    let pollCount = 0;
    const maxPolls = 60;
    const activeToken = explicitToken ?? guestToken ?? null;

    const poll = async () => {
      if (pollCount >= maxPolls) {
        setStatus("error");
        setMessage(
          "Payment processing is taking longer than expected. Check your email for order confirmation.",
        );
        return;
      }

      try {
        const url = activeToken
          ? `/api/orders/${orderId}?token=${encodeURIComponent(activeToken)}`
          : `/api/orders/${orderId}`;

        const res = await fetch(url);
        const data = await res.json();

        if (!res.ok) {
          const unauthorized = data?.error === "Unauthorized" || res.status === 401;
          if (unauthorized && !activeToken && pollCount < maxPolls) {
            pollCount++;
            setTimeout(() => {
              void poll();
            }, 1000);
            return;
          }

          if (pollCount < 5) {
            pollCount++;
            setTimeout(() => {
              void poll();
            }, 1000);
            return;
          }
          throw new Error(data.error || "Failed to fetch order status");
        }

        if (data.status === "paid" || data.status === "processing") {
          setStatus("success");
          setMessage("Payment successful!");

          setTimeout(() => {
            const targetUrl = activeToken
              ? `/checkout/success?orderId=${orderId}&token=${encodeURIComponent(activeToken)}`
              : `/checkout/success?orderId=${orderId}`;
            router.push(targetUrl);
          }, 1500);
        } else if (data.status === "failed") {
          setStatus("error");
          setMessage("Payment failed. Please try again.");
        } else {
          pollCount++;
          setTimeout(() => {
            void poll();
          }, 1000);
        }
      } catch (error) {
        console.error("Polling error:", error);
        if (pollCount < 5) {
          pollCount++;
          setTimeout(() => {
            void poll();
          }, 1000);
        } else {
          setStatus("error");
          setMessage(
            "Unable to verify payment status. Check your email for confirmation.",
          );
        }
      }
    };

    setTimeout(() => {
      void poll();
    }, 500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 px-4">
      <div className="max-w-md w-full text-center">
        {status === "processing" && (
          <>
            <Loader2 className="w-16 h-16 text-red-600 animate-spin mx-auto mb-6" />
            <h1 className="text-2xl font-bold text-white mb-3">{message}</h1>
            <p className="text-gray-400">Please don't close this page or press back.</p>
          </>
        )}

        {status === "success" && (
          <>
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-6" />
            <h1 className="text-2xl font-bold text-white mb-3">{message}</h1>
            <p className="text-gray-400">Redirecting you to your order confirmation...</p>
          </>
        )}

        {status === "error" && (
          <>
            <XCircle className="w-16 h-16 text-red-500 mx-auto mb-6" />
            <h1 className="text-2xl font-bold text-white mb-3">Payment Error</h1>
            <p className="text-gray-400 mb-6">{message}</p>
            <div className="space-y-3">
              <button
                onClick={() => router.push("/cart")}
                className="w-full px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition"
              >
                Return to Cart
              </button>
              <button
                onClick={() => router.push("/contact")}
                className="w-full px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition"
              >
                Contact Support
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
