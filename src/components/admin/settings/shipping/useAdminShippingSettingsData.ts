"use client";

import { useEffect, useMemo, useState } from "react";

import { logError } from "@/lib/utils/log";
import {
  extractOriginErrors,
  initialOrigin,
  SHIPPING_CATEGORIES,
  validateOriginDraft,
  type OriginErrors,
  type ShippingDefaultValues,
  type ShippingOriginAddress,
} from "@/components/admin/settings/shipping/shippingSettingsConfig";
import {
  loadShippingSettingsData,
  saveShippingCarriersRequest,
  saveShippingDefaultsRequest,
  saveShippingOriginRequest,
} from "@/components/admin/settings/shipping/shippingSettingsRequests";
import {
  applyShippingCostDraftValue,
  applyShippingDimensionDraftValue,
  cleanShippingDimensionInput,
  clearOriginFieldError,
  createClosedShippingDefaultsState,
  createShippingDefaultsModalState,
  toggleShippingCarrierSelection,
  updateOriginDraftField,
} from "@/components/admin/settings/shipping/shippingSettingsState";

export function useAdminShippingSettingsData() {
  const closedDefaultsState = createClosedShippingDefaultsState();
  const [shippingDefaults, setShippingDefaults] = useState<
    Record<string, ShippingDefaultValues>
  >({});
  const [originAddress, setOriginAddress] =
    useState<ShippingOriginAddress>(initialOrigin);
  const [enabledCarriers, setEnabledCarriers] = useState<string[]>([]);
  const [isSavingDefaults, setIsSavingDefaults] = useState(false);
  const [isSavingOrigin, setIsSavingOrigin] = useState(false);
  const [isSavingCarriers, setIsSavingCarriers] = useState(false);
  const [message, setMessage] = useState("");
  const [originMessage, setOriginMessage] = useState("");
  const [originError, setOriginError] = useState("");
  const [originErrors, setOriginErrors] = useState<OriginErrors>({});
  const [carriersMessage, setCarriersMessage] = useState("");
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
  const [isOriginModalOpen, setIsOriginModalOpen] = useState(false);
  const [originDraft, setOriginDraft] = useState<ShippingOriginAddress>(initialOrigin);

  const categoryMap = useMemo(
    () => new Map(SHIPPING_CATEGORIES.map((category) => [category.key, category.label])),
    [],
  );

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await loadShippingSettingsData();
        setShippingDefaults(data.shippingDefaults);
        if (data.originAddress) {
          setOriginAddress(data.originAddress);
        }
        setEnabledCarriers(data.enabledCarriers);
      } catch (error) {
        logError(error, { layer: "frontend", event: "admin_load_settings_shipping" });
      }
    };

    void loadData();
  }, []);

  const openDefaultsModal = (categoryKey: string) => {
    const current = shippingDefaults[categoryKey];
    const modalState = createShippingDefaultsModalState(current);
    setActiveCategory(categoryKey);
    setDefaultsDraft(modalState.defaultsDraft);
    setShippingCostInput(modalState.shippingCostInput);
    setWeightInput(modalState.weightInput);
    setLengthInput(modalState.lengthInput);
    setWidthInput(modalState.widthInput);
    setHeightInput(modalState.heightInput);
    setIsDefaultsModalOpen(true);
    setMessage("");
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

  const openOriginModal = () => {
    setOriginDraft({ ...originAddress });
    setIsOriginModalOpen(true);
    setOriginMessage("");
    setOriginError("");
    setOriginErrors({});
  };

  const handleDimensionInput = (
    field: "weight" | "length" | "width" | "height",
    value: string,
  ) => {
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

  const handleOriginDraftChange = (field: keyof ShippingOriginAddress, value: string) => {
    setOriginDraft((prev) => updateOriginDraftField(prev, field, value));
    if (originErrors[field]) {
      setOriginErrors((prev) => clearOriginFieldError(prev, field));
    }
    if (originError) {
      setOriginError("");
    }
  };

  const toggleCarrier = (carrierKey: string) => {
    setEnabledCarriers((prev) => toggleShippingCarrierSelection(prev, carrierKey));
  };

  const saveDefaults = async () => {
    if (!activeCategory || !defaultsDraft) {
      return;
    }

    setIsSavingDefaults(true);
    setMessage("");

    const nextDefaults: Record<string, ShippingDefaultValues> = {
      ...shippingDefaults,
      [activeCategory]: defaultsDraft,
    };

    try {
      const response = await saveShippingDefaultsRequest(
        nextDefaults,
        SHIPPING_CATEGORIES,
      );

      if (response.ok) {
        setShippingDefaults(nextDefaults);
        closeDefaultsModal();
        setMessage("Shipping defaults updated.");
      } else {
        const errorData = await response.json();
        setMessage(`Failed to update defaults: ${errorData.error}`);
      }
    } catch {
      setMessage("An unexpected error occurred.");
    } finally {
      setIsSavingDefaults(false);
    }
  };

  const saveOrigin = async () => {
    setIsSavingOrigin(true);
    setOriginMessage("");
    setOriginError("");
    setOriginErrors({});

    const draftErrors = validateOriginDraft(originDraft);
    if (Object.keys(draftErrors).length > 0) {
      setOriginErrors(draftErrors);
      setOriginError("Please fix the highlighted fields.");
      setIsSavingOrigin(false);
      return;
    }

    try {
      const response = await saveShippingOriginRequest(originDraft);
      const errorData = await response.json().catch(() => ({}));

      if (response.ok) {
        setOriginAddress(errorData.origin ?? originDraft);
        setIsOriginModalOpen(false);
        setOriginMessage("Shipping origin address saved.");
      } else {
        const fieldErrors = extractOriginErrors(errorData?.issues);
        if (Object.keys(fieldErrors).length > 0) {
          setOriginErrors(fieldErrors);
          setOriginError("Please fix the highlighted fields.");
          return;
        }
        setOriginError(errorData?.error || "Failed to save address.");
      }
    } catch {
      setOriginError("An unexpected error occurred.");
    } finally {
      setIsSavingOrigin(false);
    }
  };

  const saveCarriers = async () => {
    setIsSavingCarriers(true);
    setCarriersMessage("");

    try {
      const response = await saveShippingCarriersRequest(enabledCarriers);

      const data = await response.json().catch(() => ({}));
      if (response.ok) {
        setEnabledCarriers(data.carriers || []);
        setCarriersMessage("Enabled carriers updated.");
        setTimeout(() => setCarriersMessage(""), 3000);
      } else {
        setCarriersMessage(`Failed to save carriers: ${data.error}`);
      }
    } catch {
      setCarriersMessage("An unexpected error occurred.");
    } finally {
      setIsSavingCarriers(false);
    }
  };

  const originLine = useMemo(() => {
    const parts = [
      originAddress.line1,
      originAddress.city,
      originAddress.state,
      originAddress.postal_code,
    ].filter(Boolean);
    return parts.join(", ");
  }, [originAddress]);

  const activeCategoryLabel = activeCategory
    ? (categoryMap.get(activeCategory) ?? "")
    : "";

  return {
    activeCategory,
    activeCategoryLabel,
    carriersMessage,
    closeDefaultsModal,
    defaultsDraft,
    enabledCarriers,
    handleDimensionInput,
    handleOriginDraftChange,
    handleShippingCostChange,
    heightInput,
    isDefaultsModalOpen,
    isOriginModalOpen,
    isSavingCarriers,
    isSavingDefaults,
    isSavingOrigin,
    lengthInput,
    message,
    openDefaultsModal,
    openOriginModal,
    originAddress,
    originDraft,
    originError,
    originErrors,
    originLine,
    originMessage,
    saveCarriers,
    saveDefaults,
    saveOrigin,
    setIsOriginModalOpen,
    setShippingCostInput,
    shippingCostInput,
    shippingDefaults,
    toggleCarrier,
    weightInput,
    widthInput,
  };
}
