"use client";

import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";

import { ModalPortal } from "@/components/ui/ModalPortal";
import type { AdminOrderItem } from "@/components/admin/orders/OrderItemDetailsModal";

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

const toCents = (value: number) => Math.max(0, Math.round(value * 100));
const fromCents = (value: number) => value / 100;

const formatMoney = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);

const getItemTitle = (item: AdminOrderItem) =>
  (item.product?.title_display ??
    `${item.product?.brand ?? ""} ${item.product?.name ?? ""}`.trim()) ||
  "Item";

const getItemImage = (item: AdminOrderItem) => {
  const images = item.product?.images ?? [];
  const primary = images.find((entry) => entry.is_primary) ?? images[0];
  return primary?.url ?? "/images/rdk-logo.png";
};

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

  const totalCents = useMemo(() => toCents(Number(order?.total ?? 0)), [order?.total]);
  const refundedCents = useMemo(
    () => Math.max(0, Math.round(Number(order?.refund_amount ?? 0))),
    [order?.refund_amount],
  );
  const remainingCents = Math.max(0, totalCents - refundedCents);
  const remainingDollars = fromCents(remainingCents);

  const items = order?.items ?? [];
  const refundableItems = useMemo(
    () => items.filter((item) => !item.refunded_at),
    [items],
  );

  const selectedProductRefundCents = useMemo(
    () =>
      refundableItems
        .filter((item) => selectedItemIds.includes(item.id))
        .reduce((sum, item) => sum + toCents(Number(item.line_total ?? 0)), 0),
    [refundableItems, selectedItemIds],
  );

  const customAmountCents = useMemo(() => {
    const parsed = Number(customAmount);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return 0;
    }
    return toCents(parsed);
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
      await onConfirm({ type: "custom", amount: fromCents(customAmountCents) });
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

  const modeBtn = (m: RefundMode, label: string) => (
    <button
      key={m}
      type="button"
      onClick={() => setMode(m)}
      className={`px-3 py-1.5 text-sm border transition-colors ${
        mode === m
          ? "border-red-600 bg-red-600/10 text-white"
          : "border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-600"
      }`}
    >
      {label}
    </button>
  );

  return (
    <ModalPortal open={open} onClose={onClose} zIndexClassName="z-[10000]">
      <div
        role="dialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-3xl overflow-hidden border border-zinc-800 bg-zinc-950 shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-white">Refund Order</h2>
            <p className="mt-0.5 text-xs text-zinc-500">
              #{order?.id.slice(0, 8)} — Remaining {formatMoney(remainingDollars)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-500 transition hover:text-white"
            aria-label="Close"
            disabled={submitting}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 p-5">
          {/* Mode selector */}
          <div className="flex gap-2">
            {modeBtn("full", "Full refund")}
            {modeBtn("product", "By product")}
            {modeBtn("custom", "Custom amount")}
          </div>

          {mode === "full" && (
            <div className="border border-zinc-800 bg-zinc-900 p-4 text-sm text-zinc-400">
              Refunds the remaining balance for this order. If the order has prior partial
              refunds, this completes the refund.
            </div>
          )}

          {mode === "product" && (
            <div className="space-y-3">
              <p className="text-sm text-zinc-400">
                Select products to refund. Already-refunded products are excluded.
              </p>
              <div className="max-h-80 space-y-1.5 overflow-y-auto pr-1">
                {items.map((item) => {
                  const isRefunded = Boolean(item.refunded_at);
                  const isSelected = selectedItemIds.includes(item.id);
                  const lineTotal = Number(item.line_total ?? 0);

                  return (
                    <label
                      key={item.id}
                      className={`flex cursor-pointer items-center gap-3 border p-3 transition-colors ${
                        isRefunded
                          ? "border-zinc-800 bg-zinc-900/30 opacity-50"
                          : isSelected
                            ? "border-zinc-700 bg-zinc-900"
                            : "border-zinc-800 bg-zinc-900/50 hover:border-zinc-700"
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="rdk-checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleItem(item.id)}
                        disabled={isRefunded || submitting}
                      />
                      <img
                        src={getItemImage(item)}
                        alt={getItemTitle(item)}
                        className="h-10 w-10 flex-shrink-0 border border-zinc-800 bg-black object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm text-white">
                          {getItemTitle(item)}
                        </div>
                        <div className="text-xs text-zinc-500">
                          Size {item.variant?.size_label ?? "N/A"} · Qty{" "}
                          {Number(item.quantity ?? 0)}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-sm font-semibold text-white">
                          {formatMoney(lineTotal)}
                        </div>
                        {isRefunded && (
                          <div className="text-[11px] uppercase tracking-wide text-zinc-500">
                            Refunded
                          </div>
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>
              <div className="border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-400">
                Selected total:{" "}
                <span className="text-white font-semibold">
                  {formatMoney(fromCents(selectedProductRefundCents))}
                </span>
              </div>
            </div>
          )}

          {mode === "custom" && (
            <div className="space-y-2">
              <label className="block text-sm text-zinc-400" htmlFor="custom-refund-amount">
                Refund amount
              </label>
              <input
                id="custom-refund-amount"
                type="text"
                inputMode="decimal"
                value={customAmount}
                onChange={(event) => {
                  const val = event.target.value;
                  if (val === "" || /^\d*\.?\d{0,2}$/.test(val)) {
                    setCustomAmount(val);
                  }
                }}
                className="w-full border border-zinc-800 bg-zinc-900 px-3 py-2 text-white outline-none focus:border-zinc-600 text-sm"
                placeholder="0.00"
              />
              <p className="text-xs text-zinc-600">
                Max refundable: {formatMoney(remainingDollars)}. Custom refunds do not
                mark items as refunded.
              </p>
            </div>
          )}

          {errorMessage && <p className="text-sm text-red-400">{errorMessage}</p>}
        </div>

        <div className="flex justify-end gap-2 border-t border-zinc-800 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="border border-zinc-700 px-4 py-2 text-sm text-zinc-300 transition hover:border-zinc-500 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              void handleConfirm();
            }}
            disabled={isConfirmDisabled}
            className="bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500"
          >
            {submitting ? "Refunding..." : "Confirm refund"}
          </button>
        </div>
      </div>
    </ModalPortal>
  );
}
