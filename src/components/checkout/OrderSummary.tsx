"use client";

import Image from "next/image";
import { Loader2, ShoppingBag } from "lucide-react";
import { useMemo, useState } from "react";

import type { CartItem } from "@/types/domain/cart";
import {
  calculateCheckoutDisplayTotals,
  PROCESSING_FEE_LABEL,
} from "@/lib/checkout/display-pricing";

import { ChevronPuller } from "./ChevronPuller";

interface OrderSummaryProps {
  items: CartItem[];
  subtotal: number;
  shipping: number;
  tax: number;
  fulfillment: "ship" | "pickup";
  isUpdatingShipping?: boolean;
}

export function OrderSummary({
  items,
  subtotal,
  shipping,
  tax,
  fulfillment,
  isUpdatingShipping = false,
}: OrderSummaryProps) {
  const [isOpen, setIsOpen] = useState(false);

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const { processingFee, displayTotal } = useMemo(
    () =>
      calculateCheckoutDisplayTotals({
        subtotal,
        shipping,
        tax,
        fulfillment,
      }),
    [subtotal, shipping, tax, fulfillment],
  );

  const money = (n: number) => `$${n.toFixed(2)}`;
  const loadingInline = (label: string, compact = false) => (
    <span
      className={`inline-flex items-center gap-2 ${compact ? "text-xs" : "text-sm"} text-brand-muted`}
    >
      <Loader2 className={`${compact ? "h-3 w-3" : "h-4 w-4"} animate-spin`} />
      {label}
    </span>
  );

  const shippingValue =
    fulfillment === "pickup"
      ? "Free (Pickup)"
      : isUpdatingShipping
        ? null
        : money(shipping);

  const desktopSummary = (
    <div className="sticky top-8 hidden lg:block">
      <div className="border border-brand-border bg-brand-surface p-6 shadow-[0_20px_60px_rgba(17,17,17,0.06)]">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-bold uppercase tracking-[0.08em] text-brand-text">
          <ShoppingBag className="h-5 w-5" />
          Order Summary
        </h2>

        <div className="mb-6 max-h-96 space-y-4 overflow-y-auto">
          {items.map((item) => (
            <div key={`${item.productId}-${item.variantId}`} className="flex gap-3">
              {item.imageUrl && (
                <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden border border-brand-border bg-brand-page">
                  <Image
                    src={item.imageUrl}
                    alt={item.name}
                    fill
                    sizes="64px"
                    className="object-cover"
                  />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-sm font-medium uppercase text-brand-text">
                  {item.titleDisplay || `${item.brand} ${item.name}`}
                </h3>
                <p className="text-xs text-brand-muted">Size: {item.sizeLabel}</p>
                <p className="text-xs text-brand-muted">Qty: {item.quantity}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-brand-text">
                  {money((item.priceCents * item.quantity) / 100)}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-2 border-t border-brand-border pt-4 text-sm">
          <div className="flex justify-between text-brand-muted">
            <span>
              Subtotal ({itemCount} {itemCount === 1 ? "item" : "items"})
            </span>
            <span className="text-brand-text">{money(subtotal)}</span>
          </div>

          <div className="flex justify-between text-brand-muted">
            <span>Shipping</span>
            <span className="text-brand-text">
              {isUpdatingShipping ? loadingInline("Updating...", true) : shippingValue}
            </span>
          </div>

          <div className="flex justify-between text-brand-muted">
            <span>Tax</span>
            <span className="text-brand-text">
              {isUpdatingShipping ? loadingInline("Calculating...", true) : money(tax)}
            </span>
          </div>

          <div className="flex justify-between text-brand-muted">
            <span>Processing fee ({PROCESSING_FEE_LABEL})</span>
            <span className="text-brand-text">
              {isUpdatingShipping
                ? loadingInline("Calculating...", true)
                : money(processingFee)}
            </span>
          </div>

          <div className="mt-2 border-t border-brand-border pt-2">
            <div className="flex justify-between text-lg font-bold text-brand-text">
              <span>Total</span>
              <span>
                {isUpdatingShipping ? loadingInline("Updating...") : money(displayTotal)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const DOCK_PULL_HEIGHT = 84;
  const mobileDock = (
    <div className="lg:hidden">
      {isOpen && (
        <button
          type="button"
          aria-label="Close order summary"
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 z-40 bg-brand-overlay"
        />
      )}

      <div
        className={[
          "fixed bottom-0 left-0 right-0 z-50 transform transition-transform duration-200 ease-out",
          isOpen ? "translate-y-0" : "translate-y-[calc(100%-_DOCK_PULL_HEIGHT_px)]",
        ].join(" ")}
        style={{ "--DOCK_PULL_HEIGHT": `${DOCK_PULL_HEIGHT}` } as React.CSSProperties}
      >
        <div className="relative rounded-t-[1.5rem] border-t border-brand-border bg-brand-surface shadow-[0_-24px_80px_rgba(17,17,17,0.18)]">
          <ChevronPuller isOpen={isOpen} setIsOpen={setIsOpen} />
          <div className="px-4 pb-3 pt-3">
            <div className="mt-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingBag className="h-5 w-5 text-brand-text" />
                <div className="leading-tight">
                  <p className="text-base font-semibold text-brand-text">
                    Total: {isUpdatingShipping ? "Updating..." : money(displayTotal)}
                  </p>
                  <p className="text-xs text-brand-muted">
                    {itemCount} {itemCount === 1 ? "item" : "items"}
                  </p>
                </div>
              </div>

              <div className="text-right text-xs text-brand-muted">
                <p>
                  Subtotal:{" "}
                  <span className="font-semibold text-brand-text">{money(subtotal)}</span>
                </p>
                <p>
                  Shipping:{" "}
                  <span className="font-semibold text-brand-text">
                    {isUpdatingShipping
                      ? "..."
                      : fulfillment === "pickup"
                        ? "Free"
                        : money(shipping)}
                  </span>
                </p>
                <p>
                  Tax:{" "}
                  <span className="font-semibold text-brand-text">
                    {isUpdatingShipping ? "..." : money(tax)}
                  </span>
                </p>
                <p>
                  Fee:{" "}
                  <span className="font-semibold text-brand-text">
                    {isUpdatingShipping ? "..." : money(processingFee)}
                  </span>
                </p>
              </div>
            </div>
          </div>

          {isOpen && (
            <div className="border-t border-brand-border">
              <div className="px-4 py-4">
                <h3 className="mb-3 text-base font-semibold uppercase tracking-[0.08em] text-brand-text">
                  Items
                </h3>

                <div className="max-h-[50vh] space-y-4 overflow-y-auto pr-1">
                  {items.map((item) => (
                    <div
                      key={`${item.productId}-${item.variantId}`}
                      className="flex gap-3"
                    >
                      {item.imageUrl && (
                        <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden border border-brand-border bg-brand-page">
                          <Image
                            src={item.imageUrl}
                            alt={item.name}
                            fill
                            sizes="56px"
                            className="object-cover"
                          />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium uppercase text-brand-text">
                          {item.titleDisplay || `${item.brand} ${item.name}`}
                        </p>
                        <p className="text-xs text-brand-muted">
                          Size: {item.sizeLabel} - Qty: {item.quantity}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-brand-text">
                          {money((item.priceCents * item.quantity) / 100)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

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
      {desktopSummary}
      {mobileDock}
    </>
  );
}
