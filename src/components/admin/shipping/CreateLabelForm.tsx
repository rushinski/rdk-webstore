// src/components/admin/shipping/CreateLabelForm.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { X, AlertCircle, CheckCircle2 } from "lucide-react";

import { ModalPortal } from "@/components/ui/ModalPortal";
import type { ShippingAddress } from "@/types/domain/shipping";

type ShippingAddressDraft = {
  name: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
};

type ParcelDraft = {
  weight: number;
  length: number;
  width: number;
  height: number;
};

type AddressValidationStatus = "idle" | "validating" | "valid" | "invalid";

type AddressErrors = {
  line1?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  phone?: string;
};

type EasyPostRate = {
  id: string;
  carrier?: string | null;
  service?: string | null;
  rate?: string | null;
  currency?: string | null;
  delivery_days?: number | null;
  estimated_delivery_days?: number | null;
};

type OrderSummary = {
  id: string;
  shipping?: unknown;
};

type Props = {
  open: boolean;
  order: OrderSummary | null;
  originLine?: string | null;
  initialPackage?: ParcelDraft | null;
  onClose: () => void;
  onSuccess: () => void;
};

const resolveShippingAddress = (value: unknown): ShippingAddress | null => {
  if (!value) {
    return null;
  }
  if (Array.isArray(value)) {
    return (value[0] ?? null) as ShippingAddress | null;
  }
  if (typeof value === "object") {
    return value as ShippingAddress;
  }
  return null;
};

const clean = (v: unknown) => (typeof v === "string" ? v.trim() : "");

const money = (rateStr?: string | null, currency?: string | null) => {
  const rate = Number(rateStr ?? "");
  if (Number.isFinite(rate)) {
    return `${currency?.toUpperCase() === "USD" || !currency ? "$" : ""}${rate.toFixed(2)}`;
  }
  return rateStr ?? "-";
};

const formatDeliveryEstimate = (days?: number | null) => {
  if (!days || days <= 0) {
    return null;
  }
  const businessDays = Math.ceil(days);
  if (businessDays === 1) {
    return "Next business day";
  }
  if (businessDays === 2) {
    return "2 business days";
  }
  if (businessDays <= 5) {
    return `${businessDays} business days`;
  }
  const calendarDays = Math.ceil(businessDays * 1.4);
  return `${calendarDays} days`;
};

// Client-side address validation
const validateAddress = (address: ShippingAddressDraft): AddressErrors => {
  const errors: AddressErrors = {};

  if (!address.phone || address.phone.length < 10) {
    errors.phone = "Phone number required (10+ digits)";
  }

  if (!address.line1 || address.line1.length < 3) {
    errors.line1 = "Street address is required";
  }

  if (!address.city || address.city.length < 2) {
    errors.city = "City is required";
  }

  if (!address.state || address.state.length !== 2) {
    errors.state = "State must be 2 letters (e.g., CA, NY)";
  }

  if (!address.postal_code || !/^\d{5}(-\d{4})?$/.test(address.postal_code)) {
    errors.postal_code = "ZIP code must be 5 digits or 5+4 format";
  }

  if (!address.country || address.country.length !== 2) {
    errors.country = "Country must be 2 letters (e.g., US)";
  }

  return errors;
};

// Map API errors to user-friendly messages
const getErrorMessage = (error: string): string => {
  const lowerError = error.toLowerCase();

  if (lowerError.includes("address") && lowerError.includes("invalid")) {
    return "The recipient address is invalid. Please check street, city, state, and ZIP code.";
  }
  if (lowerError.includes("postal") || lowerError.includes("zip")) {
    return "Invalid ZIP code. Please enter a valid 5-digit ZIP code.";
  }
  if (lowerError.includes("carrier") && lowerError.includes("not")) {
    return "No carriers are enabled. Please enable carriers in Shipping Settings.";
  }
  if (lowerError.includes("rate")) {
    return "No shipping rates available. This may be due to package dimensions or destination. Try adjusting the package size.";
  }
  if (lowerError.includes("origin")) {
    return "Shipping origin address is not configured. Please set it in Shipping Settings.";
  }
  if (lowerError.includes("weight") || lowerError.includes("dimension")) {
    return "Invalid package dimensions. Weight must be > 0 oz, dimensions must be > 0 inches.";
  }
  if (lowerError.includes("already")) {
    return "A shipping label has already been purchased for this order.";
  }

  return error;
};

export function CreateLabelForm({
  open,
  order,
  originLine,
  initialPackage,
  onClose,
  onSuccess,
}: Props) {
  const orderId = order?.id ?? null;

  const initialRecipient: ShippingAddressDraft = useMemo(() => {
    const shipping = resolveShippingAddress(order?.shipping);
    return {
      name: clean(shipping?.name) || "",
      phone: clean(shipping?.phone) || "",
      line1: clean(shipping?.line1) || "",
      line2: clean(shipping?.line2) || "",
      city: clean(shipping?.city) || "",
      state: clean(shipping?.state) || "",
      postal_code: clean(shipping?.postal_code) || "",
      country: clean(shipping?.country) || "US",
    };
  }, [order]);

  const initialParcel: ParcelDraft = useMemo(() => {
    return initialPackage ?? { weight: 16, length: 12, width: 12, height: 12 };
  }, [initialPackage]);

  const [recipient, setRecipient] = useState<ShippingAddressDraft>(initialRecipient);
  const [parcel, setParcel] = useState<ParcelDraft>(initialParcel);
  const [addressErrors, setAddressErrors] = useState<AddressErrors>({});
  const [validationStatus, setValidationStatus] =
    useState<AddressValidationStatus>("idle");

  const [weightInput, setWeightInput] = useState<string>("16");
  const [lengthInput, setLengthInput] = useState<string>("12");
  const [widthInput, setWidthInput] = useState<string>("12");
  const [heightInput, setHeightInput] = useState<string>("12");

  const [shipmentId, setShipmentId] = useState<string | null>(null);
  const [rates, setRates] = useState<EasyPostRate[]>([]);
  const [selectedRateId, setSelectedRateId] = useState<string | null>(null);

  const [isGettingRates, setIsGettingRates] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);

  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");

  useEffect(() => {
    if (!open) {
      return;
    }
    setRecipient(initialRecipient);
    setParcel(initialParcel);
    setAddressErrors({});
    setValidationStatus("idle");

    setWeightInput(String(initialParcel.weight));
    setLengthInput(String(initialParcel.length));
    setWidthInput(String(initialParcel.width));
    setHeightInput(String(initialParcel.height));

    setShipmentId(null);
    setRates([]);
    setSelectedRateId(null);
    setIsGettingRates(false);
    setIsPurchasing(false);
    setError("");
    setSuccess("");
  }, [open, initialRecipient, initialParcel]);

  // Validate address on change
  useEffect(() => {
    if (validationStatus === "idle") {
      return;
    }

    const errors = validateAddress(recipient);
    setAddressErrors(errors);

    if (Object.keys(errors).length === 0) {
      setValidationStatus("valid");
    } else {
      setValidationStatus("invalid");
    }
  }, [recipient, validationStatus]);

  if (!open || !order || !orderId) {
    return null;
  }

  const setRecipientField = (field: keyof ShippingAddressDraft, value: string) => {
    setRecipient((prev) => ({ ...prev, [field]: value }));
    if (validationStatus === "idle") {
      setValidationStatus("validating");
    }
  };

  const handleParcelInput = (
    field: "weight" | "length" | "width" | "height",
    value: string,
  ) => {
    const cleaned = value.replace(/[^\d.]/g, "");

    switch (field) {
      case "weight":
        setWeightInput(cleaned);
        break;
      case "length":
        setLengthInput(cleaned);
        break;
      case "width":
        setWidthInput(cleaned);
        break;
      case "height":
        setHeightInput(cleaned);
        break;
    }

    const num = Number(cleaned);
    if (Number.isFinite(num) && num >= 0) {
      setParcel((prev) => ({ ...prev, [field]: num }));
    }
  };

  const validate = () => {
    if (!originLine) {
      return "Origin address is not set. Set it in Shipping Settings before creating labels.";
    }

    const errors = validateAddress(recipient);
    setAddressErrors(errors);
    if (Object.keys(errors).length > 0) {
      setValidationStatus("invalid");
      return "Please fix the address errors before continuing.";
    }

    if (!Number.isFinite(parcel.weight) || parcel.weight <= 0) {
      return "Weight must be greater than 0 oz.";
    }
    if (!Number.isFinite(parcel.length) || parcel.length <= 0) {
      return "Length must be greater than 0 inches.";
    }
    if (!Number.isFinite(parcel.width) || parcel.width <= 0) {
      return "Width must be greater than 0 inches.";
    }
    if (!Number.isFinite(parcel.height) || parcel.height <= 0) {
      return "Height must be greater than 0 inches.";
    }

    return null;
  };

  const getRates = async () => {
    const v = validate();
    if (v) {
      setError(v);
      return;
    }

    setError("");
    setSuccess("");
    setIsGettingRates(true);
    setRates([]);
    setSelectedRateId(null);
    setShipmentId(null);

    try {
      const res = await fetch("/api/admin/shipping/rates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          weight: parcel.weight,
          length: parcel.length,
          width: parcel.width,
          height: parcel.height,
          recipient: {
            name: recipient.name || null,
            phone: recipient.phone || null,
            line1: recipient.line1,
            line2: recipient.line2 || null,
            city: recipient.city,
            state: recipient.state,
            postal_code: recipient.postal_code,
            country: recipient.country,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(getErrorMessage(data?.error || "Failed to fetch rates."));
        return;
      }

      const nextShipmentId = data?.shipment?.id ?? null;
      const nextRates = (data?.shipment?.rates ?? []) as EasyPostRate[];

      if (!nextShipmentId) {
        setError("Rates response missing shipment ID. Please try again.");
        return;
      }
      if (nextRates.length === 0) {
        setError(
          "No rates available for the enabled carriers. Try different package dimensions or check carrier settings.",
        );
        return;
      }

      setShipmentId(nextShipmentId);
      setRates(nextRates);

      const cheapest = [...nextRates].sort(
        (a, b) => Number(a.rate ?? 999999) - Number(b.rate ?? 999999),
      )[0];
      setSelectedRateId(cheapest?.id ?? nextRates[0]?.id ?? null);
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setIsGettingRates(false);
    }
  };

  const purchase = async () => {
    if (!shipmentId || !selectedRateId) {
      setError("Please select a shipping rate before purchasing.");
      return;
    }

    setError("");
    setSuccess("");
    setIsPurchasing(true);

    try {
      const res = await fetch("/api/admin/shipping/labels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, shipmentId, rateId: selectedRateId }),
      });

      const data = await res.json();

      if (res.status === 409) {
        setError(
          getErrorMessage(data?.error || "Label already purchased for this order."),
        );
        return;
      }

      if (!res.ok) {
        setError(getErrorMessage(data?.error || "Failed to purchase label."));
        return;
      }

      setSuccess(
        '✓ Label purchased successfully! The order will move to "Need to Ship" automatically.',
      );

      // Auto-close and refresh after 2 seconds
      setTimeout(() => {
        onSuccess();
      }, 2000);
    } catch {
      setError("Network error during label purchase. Please try again.");
    } finally {
      setIsPurchasing(false);
    }
  };

  const hasAddressErrors = Object.keys(addressErrors).length > 0;

  return (
    <ModalPortal open={open} onClose={onClose}>
      <div
        className="w-full max-w-6xl rounded-lg border border-zinc-800/70 bg-zinc-950 max-h-[90vh] overflow-y-auto"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-zinc-800/70 p-5 sticky top-0 bg-zinc-950 z-10">
          <div>
            <div className="text-white text-lg font-semibold">Create shipping label</div>
            <div className="text-xs text-zinc-500 mt-1">
              Order #{String(orderId).slice(0, 8)}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-400 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
          {/* LEFT: details */}
          <div className="p-5 space-y-6 border-b lg:border-b-0 lg:border-r border-zinc-800/70">
            <div className="space-y-1">
              <div className="text-xs uppercase tracking-wide text-zinc-500">
                Shipping from
              </div>
              <div className="text-sm text-zinc-200">{originLine ?? "Not set"}</div>
              {!originLine && (
                <div className="text-xs text-red-400 mt-1">
                  ⚠ Set origin in Shipping Settings
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-xs uppercase tracking-wide text-zinc-500">
                  Shipping to
                </div>
                {validationStatus === "valid" && (
                  <div className="flex items-center gap-1 text-xs text-green-400">
                    <CheckCircle2 className="w-3 h-3" />
                    Valid address
                  </div>
                )}
                {validationStatus === "invalid" && hasAddressErrors && (
                  <div className="flex items-center gap-1 text-xs text-red-400">
                    <AlertCircle className="w-3 h-3" />
                    Fix errors below
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-2 gap-2 sm:gap-3 text-[11px] sm:text-sm">
                <div>
                  <label className="block text-gray-400 mb-0.5">Name</label>
                  <input
                    type="text"
                    value={recipient.name}
                    onChange={(e) => setRecipientField("name", e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800/70 text-white px-2 py-1.5 text-[12px] sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 mb-0.5">Phone *</label>
                  <input
                    type="text"
                    value={recipient.phone}
                    onChange={(e) => setRecipientField("phone", e.target.value)}
                    className={`w-full bg-zinc-900 border text-white px-2 py-1.5 text-[12px] sm:text-sm ${
                      addressErrors.phone ? "border-red-500" : "border-zinc-800/70"
                    }`}
                  />
                  {addressErrors.phone && (
                    <div className="text-xs text-red-400 mt-1">{addressErrors.phone}</div>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-gray-400 mb-0.5">Address line 1 *</label>
                  <input
                    type="text"
                    value={recipient.line1}
                    onChange={(e) => setRecipientField("line1", e.target.value)}
                    className={`w-full bg-zinc-900 border text-white px-2 py-1.5 text-[12px] sm:text-sm ${
                      addressErrors.line1 ? "border-red-500" : "border-zinc-800/70"
                    }`}
                  />
                  {addressErrors.line1 && (
                    <div className="text-xs text-red-400 mt-1">{addressErrors.line1}</div>
                  )}
                </div>
                <div className="md:col-span-2">
                  <label className="block text-gray-400 mb-0.5">Address line 2</label>
                  <input
                    type="text"
                    value={recipient.line2}
                    onChange={(e) => setRecipientField("line2", e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800/70 text-white px-2 py-1.5 text-[12px] sm:text-sm"
                  />
                </div>

                <div>
                  <label className="block text-gray-400 mb-0.5">City *</label>
                  <input
                    type="text"
                    value={recipient.city}
                    onChange={(e) => setRecipientField("city", e.target.value)}
                    className={`w-full bg-zinc-900 border text-white px-2 py-1.5 text-[12px] sm:text-sm ${
                      addressErrors.city ? "border-red-500" : "border-zinc-800/70"
                    }`}
                  />
                  {addressErrors.city && (
                    <div className="text-xs text-red-400 mt-1">{addressErrors.city}</div>
                  )}
                </div>
                <div>
                  <label className="block text-gray-400 mb-0.5">State *</label>
                  <input
                    type="text"
                    value={recipient.state}
                    onChange={(e) =>
                      setRecipientField("state", e.target.value.toUpperCase())
                    }
                    maxLength={2}
                    placeholder="CA"
                    className={`w-full bg-zinc-900 border text-white px-2 py-1.5 text-[12px] sm:text-sm ${
                      addressErrors.state ? "border-red-500" : "border-zinc-800/70"
                    }`}
                  />
                  {addressErrors.state && (
                    <div className="text-xs text-red-400 mt-1">{addressErrors.state}</div>
                  )}
                </div>
                <div>
                  <label className="block text-gray-400 mb-0.5">ZIP Code *</label>
                  <input
                    type="text"
                    value={recipient.postal_code}
                    onChange={(e) => setRecipientField("postal_code", e.target.value)}
                    placeholder="12345"
                    className={`w-full bg-zinc-900 border text-white px-2 py-1.5 text-[12px] sm:text-sm ${
                      addressErrors.postal_code ? "border-red-500" : "border-zinc-800/70"
                    }`}
                  />
                  {addressErrors.postal_code && (
                    <div className="text-xs text-red-400 mt-1">
                      {addressErrors.postal_code}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-gray-400 mb-0.5">Country *</label>
                  <input
                    type="text"
                    value={recipient.country}
                    onChange={(e) =>
                      setRecipientField("country", e.target.value.toUpperCase())
                    }
                    maxLength={2}
                    placeholder="US"
                    className={`w-full bg-zinc-900 border text-white px-2 py-1.5 text-[12px] sm:text-sm ${
                      addressErrors.country ? "border-red-500" : "border-zinc-800/70"
                    }`}
                  />
                  {addressErrors.country && (
                    <div className="text-xs text-red-400 mt-1">
                      {addressErrors.country}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="text-xs uppercase tracking-wide text-zinc-500">
                Package dimensions
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Weight (oz)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={weightInput}
                    onChange={(e) => handleParcelInput("weight", e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800/70 text-white px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Length (in)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={lengthInput}
                    onChange={(e) => handleParcelInput("length", e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800/70 text-white px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Width (in)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={widthInput}
                    onChange={(e) => handleParcelInput("width", e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800/70 text-white px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Height (in)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={heightInput}
                    onChange={(e) => handleParcelInput("height", e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800/70 text-white px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  void getRates();
                }}
                disabled={isGettingRates || hasAddressErrors}
                className="w-full md:w-auto px-4 py-2 bg-zinc-100 text-black text-sm font-semibold rounded hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGettingRates ? "Getting rates..." : "Get shipping rates"}
              </button>

              {error && (
                <div className="flex items-start gap-2 text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded p-3">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <div>{error}</div>
                </div>
              )}
              {success && (
                <div className="flex items-start gap-2 text-sm text-green-400 bg-green-400/10 border border-green-400/20 rounded p-3">
                  <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <div>{success}</div>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: rates + purchase */}
          <div className="p-5 space-y-4">
            <div>
              <div className="text-xs uppercase tracking-wide text-zinc-500">
                Available rates
              </div>
              <div className="text-sm text-zinc-400 mt-1">
                Select a carrier and service, then purchase the label.
              </div>
            </div>

            {rates.length === 0 ? (
              <div className="rounded border border-zinc-800/70 bg-zinc-900 p-4 text-sm text-zinc-500">
                No rates yet. Enter package details and click{" "}
                <span className="text-zinc-200">Get shipping rates</span>.
              </div>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {rates.map((r) => {
                  const selected = selectedRateId === r.id;
                  const days = r.estimated_delivery_days ?? r.delivery_days ?? null;
                  const deliveryText = formatDeliveryEstimate(days);

                  return (
                    <label
                      key={r.id}
                      className={`flex items-start gap-3 p-3 rounded border cursor-pointer transition-colors ${
                        selected
                          ? "border-red-600 bg-zinc-900/60"
                          : "border-zinc-800/70 bg-zinc-900 hover:border-zinc-700"
                      }`}
                    >
                      <input
                        type="radio"
                        name="rate"
                        checked={selected}
                        onChange={() => setSelectedRateId(r.id)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-sm text-white font-semibold">
                            {String(r.carrier ?? "Carrier")} —{" "}
                            {String(r.service ?? "Service")}
                          </div>
                          <div className="text-sm text-white font-bold">
                            {money(r.rate, r.currency)}
                          </div>
                        </div>
                        <div className="text-xs text-zinc-500 mt-1">
                          {deliveryText
                            ? `Est. delivery: ${deliveryText}`
                            : "Delivery estimate unavailable"}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}

            <div className="pt-2 space-y-3">
              <button
                type="button"
                onClick={() => {
                  void purchase();
                }}
                disabled={
                  isPurchasing ||
                  rates.length === 0 ||
                  !shipmentId ||
                  !selectedRateId ||
                  !!success
                }
                className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded disabled:bg-zinc-700 disabled:cursor-not-allowed"
              >
                {isPurchasing ? "Purchasing label..." : "Purchase shipping label"}
              </button>

              <div className="text-xs text-zinc-500 bg-zinc-900 border border-zinc-800/70 rounded p-3">
                <strong className="text-zinc-400">Note:</strong> After purchase, the label
                will be emailed to the customer and stored in the order. You can reprint
                it anytime from the order details.
              </div>
            </div>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
