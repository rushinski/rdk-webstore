import {
  type RefundableOrder,
  RefundOrderModal,
} from "@/components/admin/orders/RefundOrderModal";
import { AdminStatusBadge } from "@/components/admin/ui/AdminStatusBadge";
import { adminButtonStyles } from "@/components/admin/ui/adminButtonStyles";

type TransactionHeaderActionsProps = {
  isRefundSubmitting: boolean;
  isRefundable: boolean;
  onConfirmRefund: (
    payload:
      | {
          type: "full";
        }
      | {
          type: "product";
          itemIds: string[];
        }
      | {
          type: "custom";
          amount: number;
        },
  ) => Promise<void>;
  onOpenRefund: () => void;
  onCloseRefund: () => void;
  refundedAmount: number;
  refundedCents: number;
  refundOpen: boolean;
  refundableOrder: RefundableOrder | null;
  statusLabel: string;
  statusTone: "success" | "warning" | "danger" | "neutral";
};

export function TransactionHeaderActions({
  isRefundSubmitting,
  isRefundable,
  onConfirmRefund,
  onOpenRefund,
  onCloseRefund,
  refundedAmount,
  refundedCents,
  refundOpen,
  refundableOrder,
  statusLabel,
  statusTone,
}: TransactionHeaderActionsProps) {
  return (
    <>
      <div className="flex flex-col items-end gap-2">
        <AdminStatusBadge tone={statusTone}>{statusLabel}</AdminStatusBadge>
        {isRefundable && (
          <button
            type="button"
            onClick={onOpenRefund}
            className={adminButtonStyles.danger}
          >
            Issue refund
          </button>
        )}
        {refundedCents > 0 && (
          <div className="text-right text-sm text-red-700">
            -${refundedAmount.toFixed(2)} refunded
          </div>
        )}
      </div>

      <RefundOrderModal
        open={refundOpen}
        order={refundableOrder}
        submitting={isRefundSubmitting}
        onClose={onCloseRefund}
        onConfirm={onConfirmRefund}
      />
    </>
  );
}
