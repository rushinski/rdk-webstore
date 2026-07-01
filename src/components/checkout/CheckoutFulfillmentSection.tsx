"use client";

import { Package, TruckIcon } from "lucide-react";

import { CheckoutPolicyPanel } from "./CheckoutPolicyPanel";

interface CheckoutFulfillmentSectionProps {
  fulfillment: "ship" | "pickup";
  isUpdatingFulfillment: boolean;
  isProcessing: boolean;
  onFulfillmentChange: (fulfillment: "ship" | "pickup") => void;
}

export function CheckoutFulfillmentSection({
  fulfillment,
  isUpdatingFulfillment,
  isProcessing,
  onFulfillmentChange,
}: CheckoutFulfillmentSectionProps) {
  return (
    <div className="border border-brand-border bg-brand-surface p-5 shadow-[0_20px_60px_rgba(17,17,17,0.06)] sm:p-6">
      <h2 className="mb-4 flex items-center gap-2 text-base font-bold uppercase tracking-[0.08em] text-brand-text sm:text-lg">
        <Package className="w-5 h-5" /> Delivery Method
      </h2>
      <div className="space-y-3">
        <label className="flex cursor-pointer items-start gap-3 border border-brand-border bg-brand-page p-4 transition hover:border-brand-text">
          <input
            type="radio"
            name="fulfillment"
            value="ship"
            checked={fulfillment === "ship"}
            onChange={() => onFulfillmentChange("ship")}
            className="rdk-radio mt-1"
            disabled={isUpdatingFulfillment || isProcessing}
          />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <TruckIcon className="w-4 h-4 text-brand-muted" />
              <span className="font-medium text-brand-text">Ship to me</span>
            </div>
            <p className="mt-1 text-sm text-brand-muted">Standard shipping</p>
          </div>
        </label>
        <label className="flex cursor-pointer items-start gap-3 border border-brand-border bg-brand-page p-4 transition hover:border-brand-text">
          <input
            type="radio"
            name="fulfillment"
            value="pickup"
            checked={fulfillment === "pickup"}
            onChange={() => onFulfillmentChange("pickup")}
            className="rdk-radio mt-1"
            disabled={isUpdatingFulfillment || isProcessing}
          />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-brand-muted" />
              <span className="font-medium text-brand-text">Local pickup</span>
            </div>
            <p className="mt-1 text-sm text-brand-muted">
              Free - pick up at our location
            </p>
          </div>
        </label>
      </div>

      <CheckoutPolicyPanel fulfillment={fulfillment} supportEmail="null@gmail.com" />
    </div>
  );
}
