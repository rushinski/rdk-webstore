"use client";

import { useEffect, useMemo } from "react";
import { AlertCircle, CheckCircle2, X } from "lucide-react";

import type {
  OrderSummary,
  ParcelDraft,
  ShippingAddressDraft,
} from "@/components/admin/shipping/createLabelFormTypes";
import {
  buildInitialParcel,
  buildInitialRecipient,
  formatDeliveryEstimate,
  getErrorMessage,
  money,
  resolveShippingAddress,
  validateAddress,
} from "@/components/admin/shipping/createLabelFormView";
import { adminButtonStyles } from "@/components/admin/ui/adminButtonStyles";
import { adminFormStyles } from "@/components/admin/ui/adminFormStyles";
import { useCreateLabelFormMutations } from "@/components/admin/shipping/useCreateLabelFormMutations";
import { useCreateLabelFormState } from "@/components/admin/shipping/useCreateLabelFormState";
import { ModalPortal } from "@/components/ui/ModalPortal";

type Props = {
  open: boolean;
  order: OrderSummary | null;
  originLine?: string | null;
  initialPackage?: ParcelDraft | null;
  onClose: () => void;
  onSuccess: () => void;
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
    return buildInitialRecipient(resolveShippingAddress(order?.shipping));
  }, [order]);

  const initialParcel: ParcelDraft = useMemo(
    () => buildInitialParcel(initialPackage),
    [initialPackage],
  );

  const {
    addressErrors,
    handleParcelInput,
    heightInput,
    lengthInput,
    parcel,
    recipient,
    setAddressErrors,
    setRecipientField,
    setValidationStatus,
    validationStatus,
    weightInput,
    widthInput,
  } = useCreateLabelFormState({
    initialParcel,
    initialRecipient,
    open,
    validateAddress,
  });

  const {
    error,
    getRates,
    isGettingRates,
    isPurchasing,
    purchase,
    rates,
    resetMutationState,
    selectedRateId,
    setSelectedRateId,
    shipmentId,
    success,
  } = useCreateLabelFormMutations({
    onSuccess,
    orderId,
    originLine,
    parcel,
    recipient,
    setAddressErrors,
    setValidationStatus,
    validateAddress,
    getErrorMessage,
  });

  useEffect(() => {
    if (!open) {
      return;
    }
    resetMutationState();
  }, [open, resetMutationState]);

  if (!open || !order || !orderId) {
    return null;
  }

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
