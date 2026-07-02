import type { EasyPostRate } from "@/components/admin/shipping/createLabelFormTypes";
import {
  formatDeliveryEstimate,
  money,
} from "@/components/admin/shipping/createLabelFormView";
import { adminButtonStyles } from "@/components/admin/ui/adminButtonStyles";

type CreateLabelRatesPanelProps = {
  isPurchasing: boolean;
  purchase: () => Promise<void>;
  rates: EasyPostRate[];
  selectedRateId: string | null;
  setSelectedRateId: (value: string | null) => void;
  shipmentId: string | null;
  success: string | null;
};

export function CreateLabelRatesPanel({
  isPurchasing,
  purchase,
  rates,
  selectedRateId,
  setSelectedRateId,
  shipmentId,
  success,
}: CreateLabelRatesPanelProps) {
  return (
    <div className="space-y-4 p-5">
      <div>
        <div className="text-xs uppercase tracking-[0.12em] text-brand-muted">
          Available Rates
        </div>
        <div className="mt-1 text-sm text-brand-muted">
          Select a carrier and service, then purchase the label.
        </div>
      </div>

      {rates.length === 0 ? (
        <div className="border border-brand-border bg-brand-page p-4 text-sm text-brand-muted">
          No rates yet. Enter package details and click{" "}
          <span className="font-semibold text-brand-text">Get shipping rates</span>.
        </div>
      ) : (
        <div className="max-h-[400px] space-y-2 overflow-y-auto">
          {rates.map((rate) => {
            const selected = selectedRateId === rate.id;
            const days = rate.estimated_delivery_days ?? rate.delivery_days ?? null;
            const deliveryText = formatDeliveryEstimate(days);

            return (
              <label
                key={rate.id}
                className={`flex cursor-pointer items-start gap-3 border p-3 transition-colors ${
                  selected
                    ? "border-brand-text bg-brand-page"
                    : "border-brand-border bg-brand-surface hover:border-brand-text"
                }`}
              >
                <input
                  type="radio"
                  name="rate"
                  checked={selected}
                  onChange={() => setSelectedRateId(rate.id)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-semibold text-brand-text">
                      {String(rate.carrier ?? "Carrier")} -{" "}
                      {String(rate.service ?? "Service")}
                    </div>
                    <div className="text-sm font-bold text-brand-text">
                      {money(rate.rate, rate.currency)}
                    </div>
                  </div>
                  <div className="mt-1 text-xs text-brand-muted">
                    {deliveryText
                      ? `Est. delivery: ${deliveryText}`
                      : "Delivery estimate unavailable"}
                  </div>
                </div>
              </label>
            );
          })}
        </div>
      )}

      <div className="space-y-3 pt-2">
        <button
          type="button"
          onClick={() => {
            void purchase();
          }}
          disabled={
            isPurchasing ||
            rates.length === 0 ||
            !shipmentId ||
            !selectedRateId ||
            Boolean(success)
          }
          className={`${adminButtonStyles.primary} w-full disabled:cursor-not-allowed disabled:border-brand-border disabled:bg-brand-page disabled:text-brand-muted`}
        >
          {isPurchasing ? "Purchasing label..." : "Purchase shipping label"}
        </button>

        <div className="border border-brand-border bg-brand-page p-3 text-xs text-brand-muted">
          <strong className="text-brand-text">Note:</strong> After purchase, the label
          will be emailed to the customer and stored in the order. You can reprint it
          anytime from the order details.
        </div>
      </div>
    </div>
  );
}
