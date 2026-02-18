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
    console.info("[Processing] useEffect triggered with:", {
      orderId,
      paymentIntentId,
      redirectStatus,
      fulfillment,
      tokenParam,
      hasCalledConfirm: hasCalledConfirm.current,
      willCallConfirm: Boolean(
        redirectStatus === "succeeded" && paymentIntentId && !hasCalledConfirm.current,
      ),
    });

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

          console.info("[Processing] Confirming payment with:", {
            orderId,
            paymentIntentId,
            hasGuestEmail: Boolean(guestEmail),
          });

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

          console.info("[Processing] Confirm payment response:", {
            status: res.status,
            ok: res.ok,
            processing: data.processing,
            success: data.success,
            hasGuestToken: Boolean(data.guestAccessToken),
            tokenLength: data.guestAccessToken?.length,
          });

          if (!res.ok) {
            throw new Error(data.error || "Payment confirmation failed");
          }

          if (data.processing || data.success) {
            const returnedToken =
              typeof data.guestAccessToken === "string" && data.guestAccessToken.trim()
                ? data.guestAccessToken
                : null;

            console.info("[Processing] Token received:", {
              hasToken: Boolean(returnedToken),
              tokenLength: returnedToken?.length,
              willStartPolling: true,
            });

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

            // ✅ FIX: Always use the returned token first, fall back to stored
            const tokenForPolling = returnedToken ?? readStoredGuestToken(orderId);
            console.info("[Processing] Starting polling with token:", {
              hasToken: Boolean(tokenForPolling),
              tokenSource: returnedToken ? "returned" : "stored",
            });

            startPolling(tokenForPolling);
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
    if (!redirectStatus && !paymentIntentId) {
      console.info(
        "[Processing] Direct arrival detected (no redirect_status), starting polling:",
        {
          hasTokenParam: Boolean(tokenParam),
          hasStoredToken: Boolean(readStoredGuestToken(orderId)),
        },
      );
      // Note: If arriving here without a token in URL or state for a guest,
      // polling might fail unless the user is logged in.
      startPolling(tokenParam ?? readStoredGuestToken(orderId));
    } else if (!redirectStatus && paymentIntentId) {
      // ✅ NEW FAILSAFE: If we have a paymentIntentId but no redirectStatus,
      // this might be a direct inline completion (shouldn't happen for Afterpay but just in case)
      console.warn(
        "[Processing] Have payment_intent but no redirect_status - this is unusual",
        {
          paymentIntentId,
          orderId,
        },
      );
      // Try to confirm anyway as a failsafe
      hasCalledConfirm.current = true;
      const confirmPayment = async () => {
        try {
          setMessage("Verifying your payment...");
          const res = await fetch("/api/checkout/confirm-payment", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              orderId,
              paymentIntentId,
              fulfillment: fulfillment as "ship" | "pickup",
            }),
          });
          const data = await res.json();
          if (res.ok && (data.processing || data.success)) {
            const token = data.guestAccessToken;
            if (token) {
              persistGuestAccess(orderId, token);
              setGuestToken(token);
            }
            startPolling(token ?? readStoredGuestToken(orderId));
          } else {
            throw new Error(data.error || "Payment verification failed");
          }
        } catch (error) {
          console.error("[Processing] Failsafe confirm error:", error);
          setStatus("error");
          setMessage("Unable to verify payment. Please contact support.");
        }
      };
      void confirmPayment();
    } else if (redirectStatus && redirectStatus !== "succeeded") {
      console.error("[Processing] Unexpected redirect_status:", redirectStatus);
    }
  }, [orderId, paymentIntentId, redirectStatus, fulfillment, tokenParam, router]);

  const startPolling = (explicitToken?: string | null) => {
    let pollCount = 0;
    const maxPolls = 60;
    const activeToken = explicitToken ?? guestToken ?? null;

    console.info("[Processing] Starting polling with:", {
      hasExplicitToken: Boolean(explicitToken),
      hasGuestToken: Boolean(guestToken),
      hasActiveToken: Boolean(activeToken),
      activeTokenLength: activeToken?.length,
      orderId,
    });

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

        console.info(`[Processing] Poll #${pollCount + 1}:`, {
          url,
          hasToken: Boolean(activeToken),
          tokenLength: activeToken?.length,
        });

        const res = await fetch(url);
        const data = await res.json();

        console.info(`[Processing] Poll #${pollCount + 1} response:`, {
          status: res.status,
          ok: res.ok,
          orderStatus: data.status,
          error: data.error,
        });

        if (!res.ok) {
          const unauthorized = data?.error === "Unauthorized" || res.status === 401;

          // ✅ FIX: If unauthorized WITH a token, it's a real error
          if (unauthorized && activeToken) {
            console.error("[Processing] Unauthorized error with token:", {
              pollCount,
              hasToken: Boolean(activeToken),
              tokenLength: activeToken?.length,
            });

            // Retry a few times in case of race condition
            if (pollCount < 10) {
              pollCount++;
              setTimeout(() => {
                void poll();
              }, 2000); // Wait longer between retries
              return;
            }

            throw new Error(
              "Unable to access order. Your payment is processing. Check your email for confirmation.",
            );
          }

          // If unauthorized without token, keep retrying (might be logged in user)
          if (unauthorized && !activeToken && pollCount < maxPolls) {
            pollCount++;
            setTimeout(() => {
              void poll();
            }, 1000);
            return;
          }

          // For other errors, retry a few times
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
          console.info("[Processing] Order confirmed:", {
            status: data.status,
            orderId,
            hasToken: Boolean(activeToken),
          });

          setStatus("success");
          setMessage("Payment successful!");

          setTimeout(() => {
            const targetUrl = activeToken
              ? `/checkout/success?orderId=${orderId}&token=${encodeURIComponent(activeToken)}`
              : `/checkout/success?orderId=${orderId}`;
            console.info("[Processing] Redirecting to:", targetUrl);
            router.push(targetUrl);
          }, 1500);
        } else if (data.status === "failed") {
          console.error("[Processing] Payment failed:", data);
          setStatus("error");
          setMessage("Payment failed. Please try again.");
        } else {
          // Order is still pending, keep polling
          console.info("[Processing] Order still pending, continuing to poll...", {
            status: data.status,
            pollCount: pollCount + 1,
          });
          pollCount++;
          setTimeout(() => {
            void poll();
          }, 1000);
        }
      } catch (error) {
        console.error("[Processing] Polling error:", error);
        if (pollCount < 5) {
          pollCount++;
          setTimeout(() => {
            void poll();
          }, 1000);
        } else {
          setStatus("error");
          setMessage(
            error instanceof Error
              ? error.message
              : "Unable to verify payment status. Check your email for confirmation.",
          );
        }
      }
    };

    // ✅ FIX: Start polling immediately instead of waiting 500ms
    // The webhook might have already processed by the time we get here
    void poll();
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
