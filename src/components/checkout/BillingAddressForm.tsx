"use client";

import { CreditCard } from "lucide-react";

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
  const useSameAsShipping = Boolean(
    fulfillment === "ship" &&
      shippingAddress &&
      billingAddress &&
      billingAddress.line1 === shippingAddress.line1 &&
      billingAddress.postal_code === shippingAddress.postal_code,
  );

  const handleSameAsShippingChange = (checked: boolean) => {
    if (checked && shippingAddress) {
      onBillingAddressChange({
        name: shippingAddress.name,
        phone: shippingAddress.phone,
        line1: shippingAddress.line1,
        line2: shippingAddress.line2 || "",
        city: shippingAddress.city,
        state: shippingAddress.state,
        postal_code: shippingAddress.postal_code,
        country: shippingAddress.country,
      });
    } else if (!checked) {
      // Clear billing address when unchecking
      onBillingAddressChange({
        name: "",
        phone: "",
        line1: "",
        line2: "",
        city: "",
        state: "",
        postal_code: "",
        country: "US",
      });
    }
  };

  const updateField = (field: keyof BillingAddress, value: string) => {
    onBillingAddressChange({
      ...(billingAddress || {
        name: "",
        phone: "",
        line1: "",
        line2: "",
        city: "",
        state: "",
        postal_code: "",
        country: "US",
      }),
      [field]: value,
    });
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800/70 rounded-lg p-5 sm:p-6">
      <h2 className="text-base sm:text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <CreditCard className="w-5 h-5" /> Billing Address
      </h2>

      {/* Same as shipping checkbox - only show for shipping orders */}
      {fulfillment === "ship" && shippingAddress && (
        <div className="mb-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={useSameAsShipping}
              onChange={(e) => handleSameAsShippingChange(e.target.checked)}
              disabled={isProcessing}
              className="w-4 h-4 rounded border-zinc-700 bg-zinc-950 text-red-600 focus:ring-2 focus:ring-red-600 focus:ring-offset-0"
            />
            <span className="text-sm text-gray-300">Same as shipping address</span>
          </label>
        </div>
      )}

      {/* Billing address form - only show if not using shipping address */}
      {!useSameAsShipping && (
        <div className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={billingAddress?.name || ""}
              onChange={(e) => updateField("name", e.target.value)}
              placeholder="John Doe"
              disabled={isProcessing}
              className="w-full px-3 py-2 sm:px-4 sm:py-3 text-sm sm:text-base rounded bg-zinc-950 border border-zinc-800 text-white focus:outline-none focus:ring-2 focus:ring-red-600"
            />
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Phone Number
            </label>
            <input
              type="tel"
              value={billingAddress?.phone || ""}
              onChange={(e) => updateField("phone", e.target.value)}
              placeholder="(555) 123-4567"
              disabled={isProcessing}
              className="w-full px-3 py-2 sm:px-4 sm:py-3 text-sm sm:text-base rounded bg-zinc-950 border border-zinc-800 text-white focus:outline-none focus:ring-2 focus:ring-red-600"
            />
          </div>

          {/* Address Line 1 */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Street Address <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={billingAddress?.line1 || ""}
              onChange={(e) => updateField("line1", e.target.value)}
              placeholder="123 Main St"
              disabled={isProcessing}
              className="w-full px-3 py-2 sm:px-4 sm:py-3 text-sm sm:text-base rounded bg-zinc-950 border border-zinc-800 text-white focus:outline-none focus:ring-2 focus:ring-red-600"
            />
          </div>

          {/* Address Line 2 */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Apartment, suite, etc. (optional)
            </label>
            <input
              type="text"
              value={billingAddress?.line2 || ""}
              onChange={(e) => updateField("line2", e.target.value)}
              placeholder="Apt 4B"
              disabled={isProcessing}
              className="w-full px-3 py-2 sm:px-4 sm:py-3 text-sm sm:text-base rounded bg-zinc-950 border border-zinc-800 text-white focus:outline-none focus:ring-2 focus:ring-red-600"
            />
          </div>

          {/* City, State, ZIP */}
          <div className="grid grid-cols-6 gap-3">
            <div className="col-span-3">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                City <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={billingAddress?.city || ""}
                onChange={(e) => updateField("city", e.target.value)}
                placeholder="New York"
                disabled={isProcessing}
                className="w-full px-3 py-2 sm:px-4 sm:py-3 text-sm sm:text-base rounded bg-zinc-950 border border-zinc-800 text-white focus:outline-none focus:ring-2 focus:ring-red-600"
              />
            </div>
            <div className="col-span-1">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                State <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={billingAddress?.state || ""}
                onChange={(e) => updateField("state", e.target.value.toUpperCase())}
                placeholder="NY"
                maxLength={2}
                disabled={isProcessing}
                className="w-full px-3 py-2 sm:px-4 sm:py-3 text-sm sm:text-base rounded bg-zinc-950 border border-zinc-800 text-white focus:outline-none focus:ring-2 focus:ring-red-600 uppercase"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                ZIP Code <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={billingAddress?.postal_code || ""}
                onChange={(e) => updateField("postal_code", e.target.value)}
                placeholder="10001"
                disabled={isProcessing}
                className="w-full px-3 py-2 sm:px-4 sm:py-3 text-sm sm:text-base rounded bg-zinc-950 border border-zinc-800 text-white focus:outline-none focus:ring-2 focus:ring-red-600"
              />
            </div>
          </div>

          {/* Country */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Country <span className="text-red-500">*</span>
            </label>
            <select
              value={billingAddress?.country || "US"}
              onChange={(e) => updateField("country", e.target.value)}
              disabled={isProcessing}
              className="w-full px-3 py-2 sm:px-4 sm:py-3 text-sm sm:text-base rounded bg-zinc-950 border border-zinc-800 text-white focus:outline-none focus:ring-2 focus:ring-red-600"
            >
              <option value="US">United States</option>
              <option value="CA">Canada</option>
            </select>
          </div>
        </div>
      )}

      {/* Show billing address preview when using same as shipping */}
      {useSameAsShipping && shippingAddress && (
        <div className="mt-4 p-4 border border-zinc-800 rounded bg-zinc-950/40">
          <p className="text-sm text-gray-400 mb-2">Billing address:</p>
          <p className="text-white font-medium">{shippingAddress.name}</p>
          <p className="text-sm text-gray-400">{shippingAddress.line1}</p>
          {shippingAddress.line2 && (
            <p className="text-sm text-gray-400">{shippingAddress.line2}</p>
          )}
          <p className="text-sm text-gray-400">
            {shippingAddress.city}, {shippingAddress.state} {shippingAddress.postal_code}
          </p>
        </div>
      )}
    </div>
  );
}
