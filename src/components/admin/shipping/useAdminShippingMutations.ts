"use client";

import { useState } from "react";

import { logError } from "@/lib/utils/log";
import type { ShippingOrigin, TabKey } from "@/types/domain/shipping";

import type { ShippingOrder } from "./shippingTypes";

type OriginErrors = Partial<Record<keyof ShippingOrigin, string>>;

type UseAdminShippingMutationsParams = {
  emptyOrigin: ShippingOrigin;
  originAddress: ShippingOrigin | null;
  refreshShippingData: () => void;
  setActiveTab: (tab: TabKey) => void;
  setLabelOrder: (order: ShippingOrder | null) => void;
  setOriginAddress: React.Dispatch<React.SetStateAction<ShippingOrigin | null>>;
  validateOrigin: (origin: ShippingOrigin) => OriginErrors;
  extractOriginErrors: (
    issues: Record<string, { _errors?: string[] }> | undefined,
  ) => OriginErrors;
};

export function useAdminShippingMutations({
  emptyOrigin,
  originAddress,
  refreshShippingData,
  setActiveTab,
  setLabelOrder,
  setOriginAddress,
  validateOrigin,
  extractOriginErrors,
}: UseAdminShippingMutationsParams) {
  const [markingShippedId, setMarkingShippedId] = useState<string | null>(null);
  const [originMessage, setOriginMessage] = useState("");
  const [originError, setOriginError] = useState("");
  const [originFieldErrors, setOriginFieldErrors] = useState<OriginErrors>({});
  const [savingOrigin, setSavingOrigin] = useState(false);

  const resetOriginFeedback = () => {
    setOriginError("");
    setOriginMessage("");
    setOriginFieldErrors({});
  };

  const handleMarkShipped = async (order: ShippingOrder) => {
    setMarkingShippedId(order.id);

    try {
      const response = await fetch(`/api/admin/orders/${order.id}/fulfill`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          carrier: order.shipping_carrier ?? null,
          trackingNumber: order.tracking_number ?? null,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to mark as shipped");
      }

      refreshShippingData();
    } catch (error) {
      logError(error, { layer: "frontend", event: "admin_mark_shipped" });
    } finally {
      setMarkingShippedId(null);
    }
  };

  const handleOriginChange = (field: keyof ShippingOrigin, value: string) => {
    setOriginAddress((prev) => ({ ...(prev ?? emptyOrigin), [field]: value }));

    if (originFieldErrors[field]) {
      setOriginFieldErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }

    if (originError) {
      setOriginError("");
    }
  };

  const handleSaveOrigin = async (onSuccess?: () => void) => {
    const payload = originAddress ?? emptyOrigin;
    setSavingOrigin(true);
    resetOriginFeedback();

    const validationErrors = validateOrigin(payload);
    if (Object.keys(validationErrors).length > 0) {
      setOriginFieldErrors(validationErrors);
      setOriginError("Please fix the highlighted fields.");
      setSavingOrigin(false);
      return false;
    }

    try {
      const response = await fetch("/api/admin/shipping/origin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const fieldErrors = extractOriginErrors(data?.issues);
        if (Object.keys(fieldErrors).length > 0) {
          setOriginFieldErrors(fieldErrors);
          setOriginError("Please fix the highlighted fields.");
          return false;
        }

        throw new Error(data?.error || "Failed to save origin");
      }

      setOriginAddress(data.origin ?? payload);
      setOriginMessage("Origin address updated.");
      onSuccess?.();
      return true;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to save origin.";
      setOriginError(message);
      return false;
    } finally {
      setSavingOrigin(false);
    }
  };

  const handleLabelSuccess = () => {
    setLabelOrder(null);
    refreshShippingData();
    setActiveTab("ready");
  };

  const viewLabel = (order: ShippingOrder) => {
    const labelUrl = order.label_url ?? null;
    if (labelUrl) {
      window.open(labelUrl, "_blank", "noopener,noreferrer");
    }
  };

  return {
    handleLabelSuccess,
    handleMarkShipped,
    handleOriginChange,
    handleSaveOrigin,
    markingShippedId,
    originError,
    originFieldErrors,
    originMessage,
    resetOriginFeedback,
    savingOrigin,
    viewLabel,
  };
}
