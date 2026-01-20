"use client";

import Image from "next/image";
import { Loader2, ShoppingBag } from "lucide-react";
import { useMemo } from "react";
import type { CartItem } from "@/types/domain/cart";

interface OrderSummaryProps {
  items: CartItem[];
  subtotal: number;
  shipping: number;
  tax: number;
  total: number; // can keep, but we will not trust it for display
  fulfillment: "ship" | "pickup";
  isUpdatingShipping?: boolean;
}

export function OrderSummary({
  items,
  subtotal,
  shipping,
  tax,
  total,
  fulfillment,
  isUpdatingShipping = false,
}: OrderSummaryProps) {
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  const effectiveShipping = fulfillment === "pickup" ? 0 : shipping;

  const displayTotal = useMemo(() => {
    // Defensive rounding to cents to avoid float drift (e.g., 0.1 + 0.2 issues)
    const cents =
      Math.round(subtotal * 100) +
      Math.round(effectiveShipping * 100) +
      Math.round(tax * 100);

    return cents / 100;
  }, [subtotal, effectiveShipping, tax]);

  return (
    <div className="sticky top-8">
      <div className="bg-zinc-900 border border-zinc-800/70 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <ShoppingBag className="w-5 h-5" />
          Order Summary
        </h2>

        {/* Items List */}
        <div className="space-y-4 mb-6 max-h-96 overflow-y-auto">
          {items.map((item) => (
            <div key={`${item.productId}-${item.variantId}`} className="flex gap-3">
              {item.imageUrl && (
                <div className="relative w-16 h-16 flex-shrink-0 bg-zinc-800 rounded overflow-hidden">
                  <Image
                    src={item.imageUrl}
                    alt={item.name}
                    fill
                    sizes="64px"
                    className="object-cover"
                  />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium text-white truncate">
                  {item.titleDisplay || `${item.brand} ${item.name}`}
                </h3>
                <p className="text-xs text-gray-400">Size: {item.sizeLabel}</p>
                <p className="text-xs text-gray-400">Qty: {item.quantity}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-white">
                  ${((item.priceCents * item.quantity) / 100).toFixed(2)}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Pricing Breakdown */}
        <div className="space-y-2 text-sm border-t border-zinc-800 pt-4">
          <div className="flex justify-between text-gray-400">
            <span>
              Subtotal ({itemCount} {itemCount === 1 ? "item" : "items"})
            </span>
            <span>${subtotal.toFixed(2)}</span>
          </div>

          <div className="flex justify-between text-gray-400">
            <span>Shipping</span>
            <span className="text-xs">
              {isUpdatingShipping ? (
                <span
                  className="inline-flex items-center gap-2 text-xs text-gray-400"
                  data-testid="shipping-loading"
                >
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Updating...
                </span>
              ) : fulfillment === "pickup" ? (
                "Free (Pickup)"
              ) : (
                `$${shipping.toFixed(2)}`
              )}
            </span>
          </div>

          <div className="flex justify-between text-gray-400">
            <span>Tax</span>
            <span>
              {isUpdatingShipping ? (
                <span
                  className="inline-flex items-center gap-2 text-xs text-gray-400"
                  data-testid="tax-loading"
                >
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Calculating...
                </span>
              ) : tax > 0 ? (
                `$${tax.toFixed(2)}`
              ) : (
                "Calculated at checkout"
              )}
            </span>
          </div>

          <div className="border-t border-zinc-800 pt-2 mt-2">
            <div className="flex justify-between text-lg font-bold text-white">
              <span>Total</span>
              <span>
                {isUpdatingShipping ? (
                  <span
                    className="inline-flex items-center gap-2 text-sm text-zinc-400"
                    data-testid="total-loading"
                  >
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Updating...
                  </span>
                ) : (
                  // Prefer computed displayTotal so Tax is reflected.
                  `$${displayTotal.toFixed(2)}`
                )}
              </span>
            </div>

            {/* Optional: debugging guard (remove later) */}
            {/* {!isUpdatingShipping && Math.abs(displayTotal - total) >= 0.01 && (
              <p className="mt-1 text-xs text-amber-400">
                Note: received total ${total.toFixed(2)} but computed ${displayTotal.toFixed(2)}
              </p>
            )} */}
          </div>
        </div>

        {/* Trust Badges */}
        <div className="mt-6 pt-6 border-t border-zinc-800 space-y-3 text-xs text-gray-400">
          <div className="flex items-center gap-2">
            <div className="w-1 h-1 bg-green-500 rounded-full"></div>
            <span>Secure checkout with 256-bit encryption</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-1 h-1 bg-green-500 rounded-full"></div>
            <span>100% authentic products guaranteed</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-1 h-1 bg-green-500 rounded-full"></div>
            <span>Free returns within 30 days</span>
          </div>
        </div>
      </div>
    </div>
  );
}
