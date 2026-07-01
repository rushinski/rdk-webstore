"use client";

import { useState } from "react";

import type {
  AddressErrors,
  EasyPostRate,
  ParcelDraft,
  ShippingAddressDraft,
} from "@/components/admin/shipping/createLabelFormTypes";

type UseCreateLabelFormMutationsParams = {
  onSuccess: () => void;
  orderId: string | null;
  originLine?: string | null;
  parcel: ParcelDraft;
  recipient: ShippingAddressDraft;
  setAddressErrors: React.Dispatch<React.SetStateAction<AddressErrors>>;
  setValidationStatus: React.Dispatch<
    React.SetStateAction<"idle" | "validating" | "valid" | "invalid">
  >;
  validateAddress: (address: ShippingAddressDraft) => AddressErrors;
  getErrorMessage: (error: string) => string;
};

export function useCreateLabelFormMutations({
  onSuccess,
  orderId,
  originLine,
  parcel,
  recipient,
  setAddressErrors,
  setValidationStatus,
  validateAddress,
  getErrorMessage,
}: UseCreateLabelFormMutationsParams) {
  const [shipmentId, setShipmentId] = useState<string | null>(null);
  const [rates, setRates] = useState<EasyPostRate[]>([]);
  const [selectedRateId, setSelectedRateId] = useState<string | null>(null);
  const [isGettingRates, setIsGettingRates] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const resetMutationState = () => {
    setShipmentId(null);
    setRates([]);
    setSelectedRateId(null);
    setIsGettingRates(false);
    setIsPurchasing(false);
    setError("");
    setSuccess("");
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

  return {
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
  };
}
