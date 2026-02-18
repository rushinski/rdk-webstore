"use client";

import { useState } from "react";
import { Check, CreditCard, Plus, Copy } from "lucide-react";

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
    if (shippingAddress) {
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
    }
  };

  const handleEditAddress = () => {
    setIsModalOpen(true);
  };

  return (
    <>
      <div className="bg-zinc-900 border border-zinc-800/70 rounded-lg p-5 sm:p-6">
        <h2 className="text-base sm:text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <CreditCard className="w-5 h-5" /> Billing Address
        </h2>

        <div className="space-y-3">
          {/* Selected billing address card */}
          {billingAddress && (
            <button
              type="button"
              onClick={handleEditAddress}
              disabled={isProcessing}
              className="w-full text-left p-4 rounded border border-red-600 bg-red-600/10 transition hover:border-red-500"
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-5 h-5 rounded-full border-2 border-red-600 bg-red-600 flex items-center justify-center mt-0.5">
                  <Check className="w-3 h-3 text-white" />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium">{billingAddress.name}</p>
                  <p className="text-sm text-gray-400">{billingAddress.line1}</p>
                  {billingAddress.line2 && (
                    <p className="text-sm text-gray-400">{billingAddress.line2}</p>
                  )}
                  <p className="text-sm text-gray-400">
                    {billingAddress.city}, {billingAddress.state}{" "}
                    {billingAddress.postal_code}
                  </p>
                  {billingAddress.phone && (
                    <p className="text-sm text-gray-500 mt-1">{billingAddress.phone}</p>
                  )}
                </div>
              </div>
            </button>
          )}

          {/* Add billing address button */}
          <button
            type="button"
            onClick={handleEditAddress}
            disabled={isProcessing}
            className="w-full p-4 rounded border border-dashed border-zinc-700 hover:border-red-600 hover:bg-red-600/5 transition flex items-center justify-center gap-2 text-gray-400 hover:text-red-400"
          >
            <Plus className="w-5 h-5" />
            <span className="font-medium">
              {billingAddress ? "Edit billing address" : "Add billing address"}
            </span>
          </button>

          {/* Use shipping address button - only show for shipping orders */}
          {fulfillment === "ship" && shippingAddress && (
            <button
              type="button"
              onClick={handleUseShippingAddress}
              disabled={isProcessing}
              className="w-full p-4 rounded border border-dashed border-zinc-700 hover:border-blue-600 hover:bg-blue-600/5 transition flex items-center justify-center gap-2 text-gray-400 hover:text-blue-400"
            >
              <Copy className="w-5 h-5" />
              <span className="font-medium">Use shipping address</span>
            </button>
          )}
        </div>

        {/* Info text */}
        <p className="text-xs text-gray-500 mt-4">
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
