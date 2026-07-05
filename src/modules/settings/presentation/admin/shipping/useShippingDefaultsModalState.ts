"use client";

import { useState } from "react";

import type { ShippingDefaultValues } from "@/modules/settings/presentation/admin/shipping/shippingSettingsConfig";
import {
  applyShippingCostDraftValue,
  applyShippingDimensionDraftValue,
  cleanShippingDimensionInput,
  createClosedShippingDefaultsState,
  createShippingDefaultsModalState,
} from "@/modules/settings/presentation/admin/shipping/shippingSettingsState";

type ShippingDimensionField = "weight" | "length" | "width" | "height";

export function useShippingDefaultsModalState() {
  const closedDefaultsState = createClosedShippingDefaultsState();
  const [isDefaultsModalOpen, setIsDefaultsModalOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [defaultsDraft, setDefaultsDraft] = useState<ShippingDefaultValues | null>(null);
  const [shippingCostInput, setShippingCostInput] = useState(
    closedDefaultsState.shippingCostInput,
  );
  const [weightInput, setWeightInput] = useState(closedDefaultsState.weightInput);
  const [lengthInput, setLengthInput] = useState(closedDefaultsState.lengthInput);
  const [widthInput, setWidthInput] = useState(closedDefaultsState.widthInput);
  const [heightInput, setHeightInput] = useState(closedDefaultsState.heightInput);

  const openDefaultsModal = (
    categoryKey: string,
    current?: ShippingDefaultValues,
    onOpen?: () => void,
  ) => {
    const modalState = createShippingDefaultsModalState(current);
    setActiveCategory(categoryKey);
    setDefaultsDraft(modalState.defaultsDraft);
    setShippingCostInput(modalState.shippingCostInput);
    setWeightInput(modalState.weightInput);
    setLengthInput(modalState.lengthInput);
    setWidthInput(modalState.widthInput);
    setHeightInput(modalState.heightInput);
    setIsDefaultsModalOpen(true);
    onOpen?.();
  };

  const closeDefaultsModal = () => {
    setIsDefaultsModalOpen(false);
    setActiveCategory(null);
    setDefaultsDraft(null);
    setShippingCostInput(closedDefaultsState.shippingCostInput);
    setWeightInput(closedDefaultsState.weightInput);
    setLengthInput(closedDefaultsState.lengthInput);
    setWidthInput(closedDefaultsState.widthInput);
    setHeightInput(closedDefaultsState.heightInput);
  };

  const handleDimensionInput = (field: ShippingDimensionField, value: string) => {
    const cleaned = cleanShippingDimensionInput(value);

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

    setDefaultsDraft((prev) => applyShippingDimensionDraftValue(prev, field, cleaned));
  };

  const handleShippingCostChange = (value: string) => {
    setShippingCostInput(value);
    setDefaultsDraft((prev) => applyShippingCostDraftValue(prev, value));
  };

  return {
    activeCategory,
    closeDefaultsModal,
    defaultsDraft,
    handleDimensionInput,
    handleShippingCostChange,
    heightInput,
    isDefaultsModalOpen,
    lengthInput,
    openDefaultsModal,
    setShippingCostInput,
    setDefaultsDraft,
    shippingCostInput,
    weightInput,
    widthInput,
  };
}
