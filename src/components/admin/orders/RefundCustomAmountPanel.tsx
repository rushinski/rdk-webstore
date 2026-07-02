import { formatRefundMoney } from "@/components/admin/orders/refundOrderView";
import { adminFormStyles } from "@/components/admin/ui/adminFormStyles";

type RefundCustomAmountPanelProps = {
  customAmount: string;
  onCustomAmountChange: (value: string) => void;
  remainingDollars: number;
};

export function RefundCustomAmountPanel({
  customAmount,
  onCustomAmountChange,
  remainingDollars,
}: RefundCustomAmountPanelProps) {
  return (
    <div className="space-y-2">
      <label className="block text-sm text-brand-text" htmlFor="custom-refund-amount">
        Refund amount
      </label>
      <input
        id="custom-refund-amount"
        type="text"
        inputMode="decimal"
        value={customAmount}
        onChange={(event) => {
          const value = event.target.value;
          if (value === "" || /^\d*\.?\d{0,2}$/.test(value)) {
            onCustomAmountChange(value);
          }
        }}
        className={adminFormStyles.input}
        placeholder="0.00"
      />
      <p className="text-xs text-brand-muted">
        Max refundable: {formatRefundMoney(remainingDollars)}. Custom refunds do not mark
        items as refunded.
      </p>
    </div>
  );
}
