"use client";

import { useEffect, useMemo, useState } from "react";

import {
  fromRefundCents,
  toRefundCents,
} from "@/components/admin/orders/refundOrderView";
import type {
  RefundOrderMode,
  RefundRequestPayload,
  RefundableOrder,
} from "@/components/admin/orders/RefundOrderModal";

type UseRefundOrderStateArgs = {
  open: boolean;
  order: RefundableOrder | null;
  onConfirm: (payload: RefundRequestPayload) => Promise<void>;
};

export function useRefundOrderState({
  open,
  order,
  onConfirm,
}: UseRefundOrderStateArgs) {
  const [mode, setMode] = useState<RefundOrderMode>("full");
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [customAmount, setCustomAmount] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const totalCents = useMemo(() => toRefundCents(Number(order?.total ?? 0)), [order?.total]);
  const refundedCents = useMemo(
    () => Math.max(0, Math.round(Number(order?.refund_amount ?? 0))),
    [order?.refund_amount],
  );
  const remainingCents = Math.max(0, totalCents - refundedCents);
  const remainingDollars = fromRefundCents(remainingCents);

  const items = order?.items ?? [];
  const refundableItems = useMemo(() => items.filter((item) => !item.refunded_at), [items]);

  const selectedProductRefundCents = useMemo(
    () =>
      refundableItems
        .filter((item) => selectedItemIds.includes(item.id))
        .reduce((sum, item) => sum + toRefundCents(Number(item.line_total ?? 0)), 0),
    [refundableItems, selectedItemIds],
  );

  const customAmountCents = useMemo(() => {
    const parsed = Number(customAmount);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return 0;
    }
    return toRefundCents(parsed);
  }, [customAmount]);

  const canSelectAnyItems = refundableItems.length > 0;

  useEffect(() => {
    if (!open) {
      return;
    }

    setMode("full");
    setSelectedItemIds([]);
    setCustomAmount(remainingDollars > 0 ? remainingDollars.toFixed(2) : "");
    setErrorMessage(null);
  }, [open, order?.id, remainingDollars]);

  const handleToggleItem = (itemId: string) => {
    setSelectedItemIds((prev) =>
      prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId],
    );
  };

  const handleConfirm = async () => {
    if (!order) {
      return;
    }

    if (remainingCents <= 0) {
      setErrorMessage("This order has already been fully refunded.");
      return;
    }

    if (mode === "product") {
      if (selectedItemIds.length === 0) {
        setErrorMessage("Select at least one product to refund.");
        return;
      }
      if (selectedProductRefundCents > remainingCents) {
        setErrorMessage("Selected products exceed the remaining refundable amount.");
        return;
      }
      setErrorMessage(null);
      await onConfirm({ type: "product", itemIds: selectedItemIds });
      return;
    }

    if (mode === "custom") {
      if (customAmountCents <= 0) {
        setErrorMessage("Enter a valid refund amount.");
        return;
      }
      if (customAmountCents > remainingCents) {
        setErrorMessage("Custom refund cannot exceed the remaining refundable amount.");
        return;
      }
      setErrorMessage(null);
      await onConfirm({ type: "custom", amount: fromRefundCents(customAmountCents) });
      return;
    }

    setErrorMessage(null);
    await onConfirm({ type: "full" });
  };

  return {
    canSelectAnyItems,
    customAmount,
    customAmountCents,
    errorMessage,
    handleConfirm,
    handleToggleItem,
    items,
    mode,
    refundableItems,
    remainingCents,
    remainingDollars,
    selectedItemIds,
    selectedProductRefundCents,
    setCustomAmount,
    setMode,
  };
}
