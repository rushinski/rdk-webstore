"use client";

import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";

import { RefundCustomAmountPanel } from "@/components/admin/orders/RefundCustomAmountPanel";
import { RefundProductSelectionPanel } from "@/components/admin/orders/RefundProductSelectionPanel";
import type { AdminOrderItem } from "@/components/admin/orders/OrderItemDetailsModal";
import {
  formatRefundMoney,
  fromRefundCents,
  toRefundCents,
} from "@/components/admin/orders/refundOrderView";
import { adminButtonStyles } from "@/components/admin/ui/adminButtonStyles";
import { ModalPortal } from "@/components/ui/ModalPortal";

export type RefundRequestPayload =
  | { type: "full" }
  | { type: "product"; itemIds: string[] }
  | { type: "custom"; amount: number };

export type RefundableOrder = {
  id: string;
  total?: number | null;
  refund_amount?: number | null;
  items?: AdminOrderItem[] | null;
};

type RefundMode = "full" | "product" | "custom";

type RefundOrderModalProps = {
  open: boolean;
  order: RefundableOrder | null;
  submitting: boolean;
  onClose: () => void;
  onConfirm: (payload: RefundRequestPayload) => Promise<void>;
};

const panelStyles =
  "border border-brand-border bg-brand-surface p-4 text-sm text-brand-muted";

export function RefundOrderModal({
  open,
  order,
  submitting,
  onClose,
  onConfirm,
}: RefundOrderModalProps) {
  const [mode, setMode] = useState<RefundMode>("full");
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [customAmount, setCustomAmount] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const totalCents = useMemo(
    () => toRefundCents(Number(order?.total ?? 0)),
    [order?.total],
  );
  const refundedCents = useMemo(
    () => Math.max(0, Math.round(Number(order?.refund_amount ?? 0))),
    [order?.refund_amount],
  );
  const remainingCents = Math.max(0, totalCents - refundedCents);
  const remainingDollars = fromRefundCents(remainingCents);

  const items = order?.items ?? [];
  const refundableItems = useMemo(
    () => items.filter((item) => !item.refunded_at),
    [items],
  );

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

  const isConfirmDisabled =
    submitting ||
    !order ||
    remainingCents <= 0 ||
    (mode === "product" && (selectedItemIds.length === 0 || !canSelectAnyItems)) ||
    (mode === "custom" && (customAmountCents <= 0 || customAmountCents > remainingCents));

  const modeButtonStyles = (value: RefundMode) =>
    mode === value
      ? "border-brand-text bg-brand-text text-brand-page"
      : "border-brand-border bg-brand-page text-brand-muted hover:border-brand-text hover:text-brand-text";

  return (
    <ModalPortal open={open} onClose={onClose} zIndexClassName="z-[10000]">
      <div
        role="dialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-3xl overflow-hidden border border-brand-border bg-brand-surface shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-brand-border px-5 py-4">
          <div>
            <h2 className="text-base font-semibold uppercase tracking-[0.08em] text-brand-text">
              Refund Order
            </h2>
            <p className="mt-0.5 text-xs text-brand-muted">
              #{order?.id.slice(0, 8)} - Remaining {formatRefundMoney(remainingDollars)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-brand-muted transition hover:text-brand-text"
            aria-label="Close"
            disabled={submitting}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 p-5">
          <div className="flex gap-2">
            {(["full", "product", "custom"] as const).map((entry) => (
              <button
                key={entry}
                type="button"
                onClick={() => setMode(entry)}
                className={`border px-3 py-1.5 text-sm transition-colors ${modeButtonStyles(entry)}`}
              >
                {entry === "full"
                  ? "Full refund"
                  : entry === "product"
                    ? "By product"
                    : "Custom amount"}
              </button>
            ))}
          </div>

          {mode === "full" && (
            <div className={panelStyles}>
              Refunds the remaining balance for this order. If the order has prior partial
              refunds, this completes the refund.
            </div>
          )}

          {mode === "product" && (
            <RefundProductSelectionPanel
              items={items}
              onToggleItem={handleToggleItem}
              selectedItemIds={selectedItemIds}
              selectedProductRefundCents={selectedProductRefundCents}
              submitting={submitting}
            />
          )}

          {mode === "custom" && (
            <RefundCustomAmountPanel
              customAmount={customAmount}
              onCustomAmountChange={setCustomAmount}
              remainingDollars={remainingDollars}
            />
          )}

          {errorMessage && <p className="text-sm text-red-700">{errorMessage}</p>}
        </div>

        <div className="flex justify-end gap-2 border-t border-brand-border px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className={`${adminButtonStyles.secondary} disabled:opacity-50`}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              void handleConfirm();
            }}
            disabled={isConfirmDisabled}
            className={`${adminButtonStyles.danger} disabled:cursor-not-allowed disabled:border-brand-border disabled:bg-brand-page disabled:text-brand-muted`}
          >
            {submitting ? "Refunding..." : "Confirm refund"}
          </button>
        </div>
      </div>
    </ModalPortal>
  );
}
