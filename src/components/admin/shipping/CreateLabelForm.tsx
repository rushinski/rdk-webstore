"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, X } from "lucide-react";

import { adminButtonStyles } from "@/components/admin/ui/adminButtonStyles";
import { adminFormStyles } from "@/components/admin/ui/adminFormStyles";
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

const clean = (value: unknown) => (typeof value === "string" ? value.trim() : "");

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

const fieldInputClass = (hasError?: boolean) =>
  `${adminFormStyles.input} px-2 py-1.5 text-[12px] sm:text-sm ${hasError ? "border-red-500" : ""}`;

const statusPanelClass = "flex items-start gap-2 rounded border p-3 text-sm";

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

  const initialParcel: ParcelDraft = useMemo(
    () => initialPackage ?? { weight: 16, length: 12, width: 12, height: 12 },
    [initialPackage],
  );

  const [recipient, setRecipient] = useState<ShippingAddressDraft>(initialRecipient);
  const [parcel, setParcel] = useState<ParcelDraft>(initialParcel);
  const [addressErrors, setAddressErrors] = useState<AddressErrors>({});
  const [validationStatus, setValidationStatus] =
    useState<AddressValidationStatus>("idle");

  const [weightInput, setWeightInput] = useState("16");
  const [lengthInput, setLengthInput] = useState("12");
  const [widthInput, setWidthInput] = useState("12");
  const [heightInput, setHeightInput] = useState("12");

  const [shipmentId, setShipmentId] = useState<string | null>(null);
  const [rates, setRates] = useState<EasyPostRate[]>([]);
  const [selectedRateId, setSelectedRateId] = useState<string | null>(null);

  const [isGettingRates, setIsGettingRates] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

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

  useEffect(() => {
    if (validationStatus === "idle") {
      return;
    }

    const errors = validateAddress(recipient);
    setAddressErrors(errors);
    setValidationStatus(Object.keys(errors).length === 0 ? "valid" : "invalid");
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
    const validationError = validate();
    if (validationError) {
      setError(validationError);
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
        'Label purchased successfully. The order will move to "Need to Ship" automatically.',
      );

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
        className="max-h-[90vh] w-full max-w-6xl overflow-y-auto border border-brand-border bg-brand-surface"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-brand-border bg-brand-surface p-5">
          <div>
            <div className="text-lg font-semibold uppercase tracking-[0.08em] text-brand-text">
              Create Shipping Label
            </div>
            <div className="mt-1 text-xs text-brand-muted">
              Order #{String(orderId).slice(0, 8)}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-brand-muted transition hover:text-brand-text"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-0 lg:grid-cols-2">
          <div className="space-y-6 border-b border-brand-border p-5 lg:border-b-0 lg:border-r">
            <div className="space-y-1">
              <div className="text-xs uppercase tracking-[0.12em] text-brand-muted">
                Shipping From
              </div>
              <div className="text-sm text-brand-text">{originLine ?? "Not set"}</div>
              {!originLine && (
                <div className="mt-1 text-xs text-red-700">
                  Set the origin address in Shipping Settings.
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-xs uppercase tracking-[0.12em] text-brand-muted">
                  Shipping To
                </div>
                {validationStatus === "valid" && (
                  <div className="flex items-center gap-1 text-xs text-emerald-700">
                    <CheckCircle2 className="h-3 w-3" />
                    Valid address
                  </div>
                )}
                {validationStatus === "invalid" && hasAddressErrors && (
                  <div className="flex items-center gap-1 text-xs text-red-700">
                    <AlertCircle className="h-3 w-3" />
                    Fix errors below
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] sm:gap-3 sm:text-sm">
                <div>
                  <label className={adminFormStyles.label}>Name</label>
                  <input
                    type="text"
                    value={recipient.name}
                    onChange={(event) => setRecipientField("name", event.target.value)}
                    className={fieldInputClass()}
                  />
                </div>
                <div>
                  <label className={adminFormStyles.label}>Phone *</label>
                  <input
                    type="text"
                    value={recipient.phone}
                    onChange={(event) => setRecipientField("phone", event.target.value)}
                    className={fieldInputClass(Boolean(addressErrors.phone))}
                  />
                  {addressErrors.phone && (
                    <div className={adminFormStyles.error}>{addressErrors.phone}</div>
                  )}
                </div>

                <div className="col-span-2">
                  <label className={adminFormStyles.label}>Address line 1 *</label>
                  <input
                    type="text"
                    value={recipient.line1}
                    onChange={(event) => setRecipientField("line1", event.target.value)}
                    className={fieldInputClass(Boolean(addressErrors.line1))}
                  />
                  {addressErrors.line1 && (
                    <div className={adminFormStyles.error}>{addressErrors.line1}</div>
                  )}
                </div>
                <div className="col-span-2">
                  <label className={adminFormStyles.label}>Address line 2</label>
                  <input
                    type="text"
                    value={recipient.line2}
                    onChange={(event) => setRecipientField("line2", event.target.value)}
                    className={fieldInputClass()}
                  />
                </div>

                <div>
                  <label className={adminFormStyles.label}>City *</label>
                  <input
                    type="text"
                    value={recipient.city}
                    onChange={(event) => setRecipientField("city", event.target.value)}
                    className={fieldInputClass(Boolean(addressErrors.city))}
                  />
                  {addressErrors.city && (
                    <div className={adminFormStyles.error}>{addressErrors.city}</div>
                  )}
                </div>
                <div>
                  <label className={adminFormStyles.label}>State *</label>
                  <input
                    type="text"
                    value={recipient.state}
                    onChange={(event) =>
                      setRecipientField("state", event.target.value.toUpperCase())
                    }
                    maxLength={2}
                    placeholder="CA"
                    className={fieldInputClass(Boolean(addressErrors.state))}
                  />
                  {addressErrors.state && (
                    <div className={adminFormStyles.error}>{addressErrors.state}</div>
                  )}
                </div>
                <div>
                  <label className={adminFormStyles.label}>ZIP Code *</label>
                  <input
                    type="text"
                    value={recipient.postal_code}
                    onChange={(event) =>
                      setRecipientField("postal_code", event.target.value)
                    }
                    placeholder="12345"
                    className={fieldInputClass(Boolean(addressErrors.postal_code))}
                  />
                  {addressErrors.postal_code && (
                    <div className={adminFormStyles.error}>
                      {addressErrors.postal_code}
                    </div>
                  )}
                </div>
                <div>
                  <label className={adminFormStyles.label}>Country *</label>
                  <input
                    type="text"
                    value={recipient.country}
                    onChange={(event) =>
                      setRecipientField("country", event.target.value.toUpperCase())
                    }
                    maxLength={2}
                    placeholder="US"
                    className={fieldInputClass(Boolean(addressErrors.country))}
                  />
                  {addressErrors.country && (
                    <div className={adminFormStyles.error}>{addressErrors.country}</div>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="text-xs uppercase tracking-[0.12em] text-brand-muted">
                Package Dimensions
              </div>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <div>
                  <label className={adminFormStyles.label}>Weight (oz)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={weightInput}
                    onChange={(event) => handleParcelInput("weight", event.target.value)}
                    className={adminFormStyles.input}
                  />
                </div>
                <div>
                  <label className={adminFormStyles.label}>Length (in)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={lengthInput}
                    onChange={(event) => handleParcelInput("length", event.target.value)}
                    className={adminFormStyles.input}
                  />
                </div>
                <div>
                  <label className={adminFormStyles.label}>Width (in)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={widthInput}
                    onChange={(event) => handleParcelInput("width", event.target.value)}
                    className={adminFormStyles.input}
                  />
                </div>
                <div>
                  <label className={adminFormStyles.label}>Height (in)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={heightInput}
                    onChange={(event) => handleParcelInput("height", event.target.value)}
                    className={adminFormStyles.input}
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  void getRates();
                }}
                disabled={isGettingRates || hasAddressErrors}
                className={`${adminButtonStyles.primary} w-full md:w-auto disabled:cursor-not-allowed disabled:border-brand-border disabled:bg-brand-page disabled:text-brand-muted`}
              >
                {isGettingRates ? "Getting rates..." : "Get shipping rates"}
              </button>

              {error && (
                <div
                  className={`${statusPanelClass} border-red-200 bg-red-50 text-red-700`}
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  <div>{error}</div>
                </div>
              )}
              {success && (
                <div
                  className={`${statusPanelClass} border-emerald-200 bg-emerald-50 text-emerald-700`}
                >
                  <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  <div>{success}</div>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4 p-5">
            <div>
              <div className="text-xs uppercase tracking-[0.12em] text-brand-muted">
                Available Rates
              </div>
              <div className="mt-1 text-sm text-brand-muted">
                Select a carrier and service, then purchase the label.
              </div>
            </div>

            {rates.length === 0 ? (
              <div className="border border-brand-border bg-brand-page p-4 text-sm text-brand-muted">
                No rates yet. Enter package details and click{" "}
                <span className="font-semibold text-brand-text">Get shipping rates</span>.
              </div>
            ) : (
              <div className="max-h-[400px] space-y-2 overflow-y-auto">
                {rates.map((rate) => {
                  const selected = selectedRateId === rate.id;
                  const days = rate.estimated_delivery_days ?? rate.delivery_days ?? null;
                  const deliveryText = formatDeliveryEstimate(days);

                  return (
                    <label
                      key={rate.id}
                      className={`flex cursor-pointer items-start gap-3 border p-3 transition-colors ${
                        selected
                          ? "border-brand-text bg-brand-page"
                          : "border-brand-border bg-brand-surface hover:border-brand-text"
                      }`}
                    >
                      <input
                        type="radio"
                        name="rate"
                        checked={selected}
                        onChange={() => setSelectedRateId(rate.id)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-sm font-semibold text-brand-text">
                            {String(rate.carrier ?? "Carrier")} -{" "}
                            {String(rate.service ?? "Service")}
                          </div>
                          <div className="text-sm font-bold text-brand-text">
                            {money(rate.rate, rate.currency)}
                          </div>
                        </div>
                        <div className="mt-1 text-xs text-brand-muted">
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

            <div className="space-y-3 pt-2">
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
                  Boolean(success)
                }
                className={`${adminButtonStyles.primary} w-full disabled:cursor-not-allowed disabled:border-brand-border disabled:bg-brand-page disabled:text-brand-muted`}
              >
                {isPurchasing ? "Purchasing label..." : "Purchase shipping label"}
              </button>

              <div className="border border-brand-border bg-brand-page p-3 text-xs text-brand-muted">
                <strong className="text-brand-text">Note:</strong> After purchase, the
                label will be emailed to the customer and stored in the order. You can
                reprint it anytime from the order details.
              </div>
            </div>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
