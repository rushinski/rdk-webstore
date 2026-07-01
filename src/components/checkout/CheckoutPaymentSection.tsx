import { CreditCard, Loader2, Lock } from "lucide-react";
import type { RefObject } from "react";

export function CheckoutPaymentSection({
  cardFormRef,
  cardBrandIcon,
  cardBrandLabel,
  isPayrillaReady,
  payrillaLoadError,
  showFieldError,
  payrillaFieldError,
}: {
  cardFormRef: RefObject<HTMLDivElement | null>;
  cardBrandIcon: string;
  cardBrandLabel: string;
  isPayrillaReady: boolean;
  payrillaLoadError: string | null;
  showFieldError: boolean;
  payrillaFieldError: string | null;
}) {
  return (
    <div className="border border-brand-border bg-brand-surface p-5 shadow-[0_20px_60px_rgba(17,17,17,0.06)] sm:p-6">
      <h2 className="mb-4 flex items-center gap-2 text-base font-bold uppercase tracking-[0.08em] text-brand-text sm:text-lg">
        <CreditCard className="h-5 w-5" /> Payment Method
      </h2>

      <div className="relative max-w-[460px]">
        <div id="payrilla-card-form" ref={cardFormRef} className="min-h-[120px]" />

        <div
          className="pointer-events-none absolute right-3 flex items-center"
          style={{ top: "4px", height: "44px", left: "480px" }}
        >
          <img
            src={`/icons/cards/${cardBrandIcon}.svg`}
            alt={cardBrandLabel}
            className="h-7 w-auto"
          />
        </div>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <span className="text-xs text-brand-muted">Accepted:</span>
        {["visa", "mastercard", "american-express", "discover"].map((brand) => (
          <img
            key={brand}
            src={`/icons/cards/${brand}.svg`}
            alt={brand}
            className="h-7 w-auto opacity-60"
          />
        ))}
      </div>

      {!isPayrillaReady && !payrillaLoadError && (
        <div className="mt-3 flex items-center gap-2 text-sm text-brand-muted">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Loading card form...</span>
        </div>
      )}

      {showFieldError && payrillaFieldError && (
        <p className="mt-2 text-xs text-red-400 sm:text-sm">{payrillaFieldError}</p>
      )}

      {payrillaLoadError && (
        <p className="mt-2 text-xs text-red-400 sm:text-sm">{payrillaLoadError}</p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-brand-border pt-4 text-xs text-brand-muted">
        <Lock className="h-3.5 w-3.5 shrink-0 text-brand-text" />
        <span className="font-semibold uppercase tracking-[0.08em] text-brand-text">
          Secure payment processing
        </span>
        <span aria-hidden="true">/</span>
        <span>PCI compliant</span>
      </div>
    </div>
  );
}
