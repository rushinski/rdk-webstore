import { CreditCard, Lock } from "lucide-react";

export function CheckoutPaymentSection() {
  return (
    <div className="border border-brand-border bg-brand-surface p-5 shadow-[0_20px_60px_rgba(17,17,17,0.06)] sm:p-6">
      <h2 className="mb-4 flex items-center gap-2 text-base font-bold uppercase tracking-[0.08em] text-brand-text sm:text-lg">
        <CreditCard className="h-5 w-5" /> Payment
      </h2>

      <div className="space-y-3 text-sm text-brand-muted">
        <p>
          Orders are submitted through the storefront and finalized by the store after
          review.
        </p>
        <p>
          You will receive your confirmation details by email, and pickup customers can
          coordinate at{" "}
          <a
            href="mailto:null@gmail.com"
            className="font-semibold text-brand-text transition-colors hover:text-neutral-600"
          >
            null@gmail.com
          </a>
          .
        </p>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-brand-border pt-4 text-xs text-brand-muted">
        <Lock className="h-3.5 w-3.5 shrink-0 text-brand-text" />
        <span className="font-semibold uppercase tracking-[0.08em] text-brand-text">
          Secure checkout
        </span>
        <span aria-hidden="true">/</span>
        <span>Order details are stored before submission completes.</span>
      </div>
    </div>
  );
}
