"use client";

import Image from "next/image";
import { Loader2, ShoppingBag, ChevronUp } from "lucide-react";
import { useMemo, useState } from "react";
import type { CartItem } from "@/types/domain/cart";
import { ChevronPuller } from "./ChevronPuller";

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
  const [isOpen, setIsOpen] = useState(false);

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const effectiveShipping = fulfillment === "pickup" ? 0 : shipping;

  const displayTotal = useMemo(() => {
    const cents =
      Math.round(subtotal * 100) +
      Math.round(effectiveShipping * 100) +
      Math.round(tax * 100);
    return cents / 100;
  }, [subtotal, effectiveShipping, tax]);

  const money = (n: number) => `$${n.toFixed(2)}`;

  const ShippingValue = (
    <span className="text-xs sm:text-sm">
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
        money(shipping)
      )}
    </span>
  );

  const TaxValue = (
    <span>
      {isUpdatingShipping ? (
        <span
          className="inline-flex items-center gap-2 text-xs text-gray-400"
          data-testid="tax-loading"
        >
          <Loader2 className="w-3 h-3 animate-spin" />
          Calculating...
        </span>
      ) : (
        money(tax)
      )}
    </span>
  );

  const TotalValue = (
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
        money(displayTotal)
      )}
    </span>
  );

  // -----------------------------
  // Desktop sidebar (lg+)
  // -----------------------------
  const DesktopSummary = (
    <div className="hidden lg:block sticky top-8">
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
                  {money((item.priceCents * item.quantity) / 100)}
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
            <span>{money(subtotal)}</span>
          </div>

          <div className="flex justify-between text-gray-400">
            <span>Shipping</span>
            {ShippingValue}
          </div>

          <div className="flex justify-between text-gray-400">
            <span>Tax</span>
            {TaxValue}
          </div>

          <div className="border-t border-zinc-800 pt-2 mt-2">
            <div className="flex justify-between text-lg font-bold text-white">
              <span>Total</span>
              {TotalValue}
            </div>
          </div>
        </div>

        {/* Trust Badges */}
        <div className="mt-6 pt-6 border-t border-zinc-800 space-y-3 text-xs text-gray-400">
          <div className="flex items-center gap-2">
            <div className="w-1 h-1 bg-green-500 rounded-full" />
            <span>Stripe secure payment processing</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-1 h-1 bg-green-500 rounded-full" />
            <span>100% authentic products guaranteed</span>
          </div>
        </div>
      </div>
    </div>
  );

  // -----------------------------
  // Mobile dock + drawer ( < lg )
  // -----------------------------
  const DOCK_PULL_HEIGHT = 84;
  const MobileDock = (
    <div className="lg:hidden">
      {/* Drawer overlay */}
      {isOpen && (
        <button
          type="button"
          aria-label="Close order summary"
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 z-40 bg-black/60"
        />
      )}

      {/* Drawer panel */}
      <div
        className={[
          "fixed left-0 right-0 bottom-0 z-50",
          "transform transition-transform duration-200 ease-out",
          isOpen
            ? "translate-y-0"
            : `translate-y-[calc(100%-_DOCK_PULL_HEIGHT_px)]`,
        ].join(" ")}
        aria-label="Mobile order summary"
        style={
          {
            "--DOCK_PULL_HEIGHT": `${DOCK_PULL_HEIGHT}`,
          } as React.CSSProperties
        }
      >
        <div className="relative bg-zinc-950/95 border-t border-zinc-800 backdrop-blur rounded-t-2xl shadow-2xl">
          <ChevronPuller isOpen={isOpen} setIsOpen={setIsOpen} />
          {/* Handle + header row */}
          <div className="px-4 pt-3">
            <div className="mt-3 flex items-start justify-between">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-gray-300" />
                <div className="leading-tight">
                  <p className="text-base font-semibold text-white">
                    Total: {TotalValue}
                  </p>
                  <p className="text-xs text-gray-400">
                    {itemCount} {itemCount === 1 ? "item" : "items"}
                  </p>
                </div>
              </div>

              <div className="text-right text-xs">
                <p className="text-gray-400">
                  Subtotal:{" "}
                  <span className="text-white font-semibold">
                    {money(subtotal)}
                  </span>
                </p>
                <p className="text-gray-400">
                  Shipping:{" "}
                  <span className="text-white font-semibold">
                    {isUpdatingShipping
                      ? "…"
                      : fulfillment === "pickup"
                      ? "Free"
                      : money(shipping)}
                  </span>
                </p>
                <p className="text-gray-400">
                  Tax:{" "}
                  <span className="text-white font-semibold">
                    {isUpdatingShipping ? "…" : money(tax)}
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* Expanded content */}
          {isOpen && (
            <div className="border-t border-zinc-800">
              <div className="px-4 py-4">
                <h3 className="text-base font-semibold text-white mb-3">
                  Items
                </h3>

                <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-1">
                  {items.map((item) => (
                    <div
                      key={`${item.productId}-${item.variantId}`}
                      className="flex gap-3"
                    >
                      {item.imageUrl && (
                        <div className="relative w-14 h-14 flex-shrink-0 bg-zinc-800 rounded overflow-hidden">
                          <Image
                            src={item.imageUrl}
                            alt={item.name}
                            fill
                            sizes="56px"
                            className="object-cover"
                          />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">
                          {item.titleDisplay || `${item.brand} ${item.name}`}
                        </p>
                        <p className="text-xs text-gray-400">
                          Size: {item.sizeLabel} • Qty: {item.quantity}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-white">
                          {money((item.priceCents * item.quantity) / 100)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Trust badges (mobile) */}
                <div className="mt-4 pt-4 border-t border-zinc-800 space-y-2 text-xs text-gray-400">
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-1 bg-green-500 rounded-full" />
                    <span>Stripe secure payment processing</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-1 bg-green-500 rounded-full" />
                    <span>100% authentic products guaranteed</span>
                  </div>
                </div>

                {/* Safe-area spacer */}
                <div className="h-4" />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {DesktopSummary}
      {MobileDock}
    </>
  );
}
