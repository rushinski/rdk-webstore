"use client";

import { useState } from "react";

import type {
  OriginErrors,
  ShippingOriginAddress,
} from "@/components/admin/settings/shipping/shippingSettingsConfig";
import {
  clearOriginFieldError,
  updateOriginDraftField,
} from "@/components/admin/settings/shipping/shippingSettingsState";

export function useShippingOriginModalState(initialOrigin: ShippingOriginAddress) {
  const [isOriginModalOpen, setIsOriginModalOpen] = useState(false);
  const [originDraft, setOriginDraft] = useState<ShippingOriginAddress>(initialOrigin);
  const [originMessage, setOriginMessage] = useState("");
  const [originError, setOriginError] = useState("");
  const [originErrors, setOriginErrors] = useState<OriginErrors>({});

  const openOriginModal = (originAddress: ShippingOriginAddress) => {
    setOriginDraft({ ...originAddress });
    setIsOriginModalOpen(true);
    setOriginMessage("");
    setOriginError("");
    setOriginErrors({});
  };

  const handleOriginDraftChange = (
    field: keyof ShippingOriginAddress,
    value: string,
  ) => {
    setOriginDraft((prev) => updateOriginDraftField(prev, field, value));
    setOriginErrors((prev) => clearOriginFieldError(prev, field));
    setOriginError("");
  };

  return {
    handleOriginDraftChange,
    isOriginModalOpen,
    openOriginModal,
    originDraft,
    originError,
    originErrors,
    originMessage,
    setIsOriginModalOpen,
    setOriginDraft,
    setOriginError,
    setOriginErrors,
    setOriginMessage,
  };
}
