"use client";

import { useEffect, useMemo } from "react";
import { X } from "lucide-react";

import { CreateLabelRatesPanel } from "@/modules/orders/presentation/admin/shipping/CreateLabelRatesPanel";
import { CreateLabelRecipientPanel } from "@/modules/orders/presentation/admin/shipping/CreateLabelRecipientPanel";
import type {
  OrderSummary,
  ParcelDraft,
  ShippingAddressDraft,
} from "@/modules/orders/presentation/admin/shipping/createLabelFormTypes";
import {
  buildInitialParcel,
  buildInitialRecipient,
  getErrorMessage,
  resolveShippingAddress,
  validateAddress,
} from "@/modules/orders/presentation/admin/shipping/createLabelFormView";
import { useCreateLabelFormMutations } from "@/modules/orders/presentation/admin/shipping/useCreateLabelFormMutations";
import { useCreateLabelFormState } from "@/modules/orders/presentation/admin/shipping/useCreateLabelFormState";
import { ModalPortal } from "@/components/ui/ModalPortal";

type Props = {
  open: boolean;
  order: OrderSummary | null;
  originLine?: string | null;
  initialPackage?: ParcelDraft | null;
  onClose: () => void;
  onSuccess: () => void;
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
          <CreateLabelRecipientPanel
            addressErrors={addressErrors}
            error={error}
            getRates={getRates}
            handleParcelInput={handleParcelInput}
            hasAddressErrors={hasAddressErrors}
            heightInput={heightInput}
            isGettingRates={isGettingRates}
            lengthInput={lengthInput}
            originLine={originLine}
            recipient={recipient}
            setRecipientField={setRecipientField}
            success={success}
            validationStatus={validationStatus}
            weightInput={weightInput}
            widthInput={widthInput}
          />
          <CreateLabelRatesPanel
            isPurchasing={isPurchasing}
            purchase={purchase}
            rates={rates}
            selectedRateId={selectedRateId}
            setSelectedRateId={setSelectedRateId}
            shipmentId={shipmentId}
            success={success}
          />
        </div>
      </div>
    </ModalPortal>
  );
}
