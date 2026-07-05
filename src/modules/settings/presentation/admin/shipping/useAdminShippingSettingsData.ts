"use client";

import { useEffect, useMemo, useState } from "react";

import { logError } from "@/lib/utils/log";
import {
  extractOriginErrors,
  initialOrigin,
  SHIPPING_CATEGORIES,
  validateOriginDraft,
  type ShippingDefaultValues,
  type ShippingOriginAddress,
} from "@/modules/settings/presentation/admin/shipping/shippingSettingsConfig";
import {
  loadShippingSettingsData,
  saveShippingCarriersRequest,
  saveShippingDefaultsRequest,
  saveShippingOriginRequest,
} from "@/modules/settings/presentation/admin/shipping/shippingSettingsRequests";
import {
  toggleShippingCarrierSelection,
} from "@/modules/settings/presentation/admin/shipping/shippingSettingsState";
import { useShippingDefaultsModalState } from "@/modules/settings/presentation/admin/shipping/useShippingDefaultsModalState";
import { useShippingOriginModalState } from "@/modules/settings/presentation/admin/shipping/useShippingOriginModalState";

export function useAdminShippingSettingsData() {
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
  const [carriersMessage, setCarriersMessage] = useState("");
  const {
    activeCategory,
    closeDefaultsModal,
    defaultsDraft,
    handleDimensionInput,
    handleShippingCostChange,
    heightInput,
    isDefaultsModalOpen,
    lengthInput,
    openDefaultsModal: openDefaultsModalState,
    setShippingCostInput,
    shippingCostInput,
    weightInput,
    widthInput,
  } = useShippingDefaultsModalState();
  const {
    handleOriginDraftChange,
    isOriginModalOpen,
    openOriginModal: openOriginModalState,
    originDraft,
    originError,
    originErrors,
    originMessage,
    setIsOriginModalOpen,
    setOriginError,
    setOriginErrors,
    setOriginMessage,
  } = useShippingOriginModalState(initialOrigin);

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
    openDefaultsModalState(categoryKey, shippingDefaults[categoryKey], () => {
      setMessage("");
    });
  };

  const openOriginModal = () => {
    openOriginModalState(originAddress);
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
