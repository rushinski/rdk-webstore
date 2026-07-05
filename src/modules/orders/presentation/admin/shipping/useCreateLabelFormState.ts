"use client";

import { useEffect, useState } from "react";

import type {
  AddressErrors,
  AddressValidationStatus,
  ParcelDraft,
  ShippingAddressDraft,
} from "@/modules/orders/presentation/admin/shipping/createLabelFormTypes";

type UseCreateLabelFormStateParams = {
  initialParcel: ParcelDraft;
  initialRecipient: ShippingAddressDraft;
  open: boolean;
  validateAddress: (address: ShippingAddressDraft) => AddressErrors;
};

export function useCreateLabelFormState({
  initialParcel,
  initialRecipient,
  open,
  validateAddress,
}: UseCreateLabelFormStateParams) {
  const [recipient, setRecipient] = useState<ShippingAddressDraft>(initialRecipient);
  const [parcel, setParcel] = useState<ParcelDraft>(initialParcel);
  const [addressErrors, setAddressErrors] = useState<AddressErrors>({});
  const [validationStatus, setValidationStatus] =
    useState<AddressValidationStatus>("idle");
  const [weightInput, setWeightInput] = useState("16");
  const [lengthInput, setLengthInput] = useState("12");
  const [widthInput, setWidthInput] = useState("12");
  const [heightInput, setHeightInput] = useState("12");

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
  }, [initialParcel, initialRecipient, open]);

  useEffect(() => {
    if (validationStatus === "idle") {
      return;
    }

    const errors = validateAddress(recipient);
    setAddressErrors(errors);
    setValidationStatus(Object.keys(errors).length === 0 ? "valid" : "invalid");
  }, [recipient, validateAddress, validationStatus]);

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

  return {
    addressErrors,
    handleParcelInput,
    heightInput,
    lengthInput,
    parcel,
    recipient,
    setAddressErrors,
    setRecipient,
    setRecipientField,
    setValidationStatus,
    validationStatus,
    weightInput,
    widthInput,
  };
}
