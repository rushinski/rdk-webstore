"use client";

import { Check, Copy, CreditCard, Plus } from "lucide-react";
import { useState } from "react";

import { BillingAddressModal } from "./BillingAddressModal";

export interface BillingAddress {
  name: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
}

interface BillingAddressFormProps {
  billingAddress: BillingAddress | null;
  onBillingAddressChange: (address: BillingAddress | null) => void;
  shippingAddress?: {
    name: string;
    phone: string;
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
  } | null;
  fulfillment: "ship" | "pickup";
  isProcessing?: boolean;
}

export function BillingAddressForm({
  billingAddress,
  onBillingAddressChange,
  shippingAddress,
  fulfillment,
  isProcessing = false,
}: BillingAddressFormProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleSaveAddress = (address: BillingAddress) => {
    onBillingAddressChange(address);
    setIsModalOpen(false);
  };

  const handleUseShippingAddress = () => {
    if (!shippingAddress) {
      return;
    }
    onBillingAddressChange({
      name: shippingAddress.name,
      phone: shippingAddress.phone,
      line1: shippingAddress.line1,
      line2: shippingAddress.line2 || "",
      city: shippingAddress.city,
      state: shippingAddress.state,
      postal_code: shippingAddress.postal_code,
      country: "US",
    });
  };

  return (
    <>
      <div className="border border-brand-border bg-brand-surface p-5 shadow-[0_20px_60px_rgba(17,17,17,0.06)] sm:p-6">
        <h2 className="mb-4 flex items-center gap-2 text-base font-bold uppercase tracking-[0.08em] text-brand-text sm:text-lg">
          <CreditCard className="h-5 w-5" />
          Billing Address
        </h2>

        <div className="space-y-3">
          {billingAddress && (
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              disabled={isProcessing}
              className="w-full border border-brand-text bg-brand-page p-4 text-left transition-colors hover:border-neutral-600"
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center border border-brand-text bg-brand-text text-brand-surface">
                  <Check className="h-3 w-3" />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="font-medium text-brand-text">{billingAddress.name}</p>
                  <p className="text-sm text-brand-muted">{billingAddress.line1}</p>
                  {billingAddress.line2 && (
                    <p className="text-sm text-brand-muted">{billingAddress.line2}</p>
                  )}
                  <p className="text-sm text-brand-muted">
                    {billingAddress.city}, {billingAddress.state}{" "}
                    {billingAddress.postal_code}
                  </p>
                  {billingAddress.phone && (
                    <p className="mt-1 text-sm text-brand-muted">
                      {billingAddress.phone}
                    </p>
                  )}
                </div>
              </div>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            disabled={isProcessing}
            className="flex w-full items-center justify-center gap-2 border border-dashed border-brand-border bg-brand-page p-4 text-brand-text transition-colors hover:border-brand-text"
          >
            <Plus className="h-5 w-5" />
            <span className="font-medium uppercase tracking-[0.08em]">
              {billingAddress ? "Edit billing address" : "Add billing address"}
            </span>
          </button>

          {fulfillment === "ship" && shippingAddress && (
            <button
              type="button"
              onClick={handleUseShippingAddress}
              disabled={isProcessing}
              className="flex w-full items-center justify-center gap-2 border border-dashed border-brand-border bg-brand-surface p-4 text-brand-text transition-colors hover:border-brand-text"
            >
              <Copy className="h-5 w-5" />
              <span className="font-medium uppercase tracking-[0.08em]">
                Use shipping address
              </span>
            </button>
          )}
        </div>

        <p className="mt-4 text-xs text-brand-muted">
          Required for payment verification and fraud prevention.
        </p>
      </div>

      <BillingAddressModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveAddress}
        initialAddress={billingAddress}
      />
    </>
  );
}
