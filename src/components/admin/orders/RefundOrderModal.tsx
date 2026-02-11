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

  const totalCents = useMemo(
    () => toCents(Number(order?.total ?? 0)),
    [order?.total],
  );
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

  return (
    <ModalPortal open={open} onClose={onClose} zIndexClassName="z-[10000]">
      <div
        role="dialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-3xl overflow-hidden rounded border border-zinc-800 bg-zinc-950 shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Refund Order</h2>
            <p className="mt-1 text-sm text-gray-400">
              #{order?.id.slice(0, 8)} - Remaining {formatMoney(remainingDollars)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 transition hover:text-white"
            aria-label="Close"
            disabled={submitting}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 p-5">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <button
              type="button"
              onClick={() => setMode("full")}
              className={`rounded border px-3 py-2 text-sm transition ${
                mode === "full"
                  ? "border-red-600 bg-red-600/10 text-white"
                  : "border-zinc-800 text-gray-300 hover:border-zinc-600"
              }`}
            >
              Full refund
            </button>
            <button
              type="button"
              onClick={() => setMode("product")}
              className={`rounded border px-3 py-2 text-sm transition ${
                mode === "product"
                  ? "border-red-600 bg-red-600/10 text-white"
                  : "border-zinc-800 text-gray-300 hover:border-zinc-600"
              }`}
            >
              Product refund
            </button>
            <button
              type="button"
              onClick={() => setMode("custom")}
              className={`rounded border px-3 py-2 text-sm transition ${
                mode === "custom"
                  ? "border-red-600 bg-red-600/10 text-white"
                  : "border-zinc-800 text-gray-300 hover:border-zinc-600"
              }`}
            >
              Custom amount
            </button>
          </div>

          {mode === "full" && (
            <div className="rounded border border-zinc-800 bg-zinc-900/50 p-4 text-sm text-gray-300">
              Refunds the remaining balance for this order. If the order has prior partial
              refunds, this completes the refund.
            </div>
          )}

          {mode === "product" && (
            <div className="space-y-3">
              <div className="text-sm text-gray-300">
                Select products to refund. Refunded products are excluded.
              </div>
              <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
                {items.map((item) => {
                  const isRefunded = Boolean(item.refunded_at);
                  const isSelected = selectedItemIds.includes(item.id);
                  const lineTotal = Number(item.line_total ?? 0);

                  return (
                    <label
                      key={item.id}
                      className={`flex cursor-pointer items-center gap-3 rounded border p-3 ${
                        isRefunded
                          ? "border-zinc-800 bg-zinc-900/30 opacity-60"
                          : "border-zinc-800 bg-zinc-900/50 hover:border-zinc-600"
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
                        className="h-12 w-12 flex-shrink-0 border border-zinc-800 bg-black object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold text-white">
                          {getItemTitle(item)}
                        </div>
                        <div className="text-xs text-gray-500">
                          Size {item.variant?.size_label ?? "N/A"} - Qty{" "}
                          {Number(item.quantity ?? 0)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold text-white">
                          {formatMoney(lineTotal)}
                        </div>
                        <div className="text-[11px] uppercase tracking-wide text-gray-500">
                          {isRefunded ? "Refunded" : "Refundable"}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
              <div className="rounded border border-zinc-800 bg-zinc-900/50 px-3 py-2 text-sm text-gray-300">
                Selected refund total: {formatMoney(fromCents(selectedProductRefundCents))}
              </div>
            </div>
          )}

          {mode === "custom" && (
            <div className="space-y-2">
              <label className="block text-sm text-gray-300" htmlFor="custom-refund-amount">
                Refund amount
              </label>
              <input
                id="custom-refund-amount"
                type="number"
                min="0.01"
                step="0.01"
                max={remainingDollars.toFixed(2)}
                value={customAmount}
                onChange={(event) => setCustomAmount(event.target.value)}
                className="w-full rounded border border-zinc-800 bg-zinc-900 px-3 py-2 text-white outline-none focus:border-red-600"
                placeholder="0.00"
              />
              <p className="text-xs text-gray-500">
                Max refundable: {formatMoney(remainingDollars)}. Custom refunds do not mark
                items as refunded.
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
            className="rounded border border-zinc-700 px-4 py-2 text-sm font-semibold text-gray-200 transition hover:border-zinc-500 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              void handleConfirm();
            }}
            disabled={isConfirmDisabled}
            className="rounded bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500"
          >
            {submitting ? "Refunding..." : "Confirm refund"}
          </button>
        </div>
      </div>
    </ModalPortal>
  );
}
