"use client";

import { X } from "lucide-react";

import { RefundCustomAmountPanel } from "@/modules/orders/presentation/admin/refund-order/RefundCustomAmountPanel";
import { RefundModeTabs } from "@/modules/orders/presentation/admin/refund-order/RefundModeTabs";
import { RefundProductSelectionPanel } from "@/modules/orders/presentation/admin/refund-order/RefundProductSelectionPanel";
import { formatRefundMoney } from "@/modules/orders/presentation/admin/refund-order/refundOrderView";
import type {
  RefundRequestPayload,
  RefundableOrder,
} from "@/modules/orders/presentation/admin/refund-order/refundOrderTypes";
import { useRefundOrderState } from "@/modules/orders/presentation/admin/refund-order/useRefundOrderState";
import { adminButtonStyles } from "@/components/admin/ui/adminButtonStyles";
import { ModalPortal } from "@/components/ui/ModalPortal";

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
  const {
    canSelectAnyItems,
    customAmount,
    customAmountCents,
    errorMessage,
    handleConfirm,
    handleToggleItem,
    items,
    mode,
    remainingCents,
    remainingDollars,
    selectedItemIds,
    selectedProductRefundCents,
    setCustomAmount,
    setMode,
  } = useRefundOrderState({
    open,
    order,
    onConfirm,
  });

  const isConfirmDisabled =
    submitting ||
    !order ||
    remainingCents <= 0 ||
    (mode === "product" && (selectedItemIds.length === 0 || !canSelectAnyItems)) ||
    (mode === "custom" &&
      (customAmountCents <= 0 || customAmountCents > remainingCents));

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
          <RefundModeTabs mode={mode} onModeChange={setMode} />

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
