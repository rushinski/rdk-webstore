"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { XCircle } from "lucide-react";

import { clearGuestShippingAddress } from "@/lib/checkout/guest-shipping-address";
import { clearIdempotencyKeyFromStorage } from "@/lib/checkout/idempotency";

export default function CheckoutCancelPage() {
  const router = useRouter();

  useEffect(() => {
    clearIdempotencyKeyFromStorage();
    clearGuestShippingAddress();
  }, []);

  return (
    <div className="mx-auto max-w-2xl px-4 py-20 text-center">
      <XCircle className="mx-auto mb-6 h-16 w-16 text-brand-text" />
      <p className="text-xs uppercase tracking-[0.35em] text-brand-muted">Checkout</p>
      <h1 className="mb-4 mt-3 text-3xl font-black uppercase tracking-[0.08em] text-brand-text">
        Checkout canceled
      </h1>
      <p className="mb-8 text-brand-muted">
        Your order has been canceled. No charges were made to your account.
      </p>

      <div className="space-y-3">
        <button
          onClick={() => router.push("/cart")}
          className="w-full border border-brand-text bg-brand-text py-3 text-sm font-bold uppercase tracking-[0.08em] text-brand-surface transition-colors hover:bg-neutral-800"
        >
          Return to cart
        </button>
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
