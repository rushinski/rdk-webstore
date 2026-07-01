import Link from "next/link";

export function CheckoutPolicyPanel({
  fulfillment,
  supportEmail,
}: {
  fulfillment: "ship" | "pickup";
  supportEmail: string;
}) {
  if (fulfillment === "pickup") {
    return (
      <div className="mt-4 space-y-2 border border-brand-border bg-brand-page p-4 text-sm text-brand-muted">
        <p className="mb-2 font-medium uppercase tracking-[0.08em] text-brand-text">
          Pickup Information
        </p>
        <p>After purchase, you&apos;ll receive a pickup email for scheduling.</p>
        <p>
          You can also reach us at{" "}
          <a
            href={`mailto:${supportEmail}`}
            className="font-semibold text-brand-text transition-colors hover:text-neutral-600"
            target="_blank"
            rel="noreferrer"
          >
            {supportEmail}
          </a>
          .
        </p>
        <div className="mt-3 border-t border-brand-border pt-3">
          <p className="mb-2 font-medium uppercase tracking-[0.08em] text-brand-text">
            Returns &amp; Refunds
          </p>
          <p>
            All sales are final except as outlined in our Returns &amp; Refunds policy.
          </p>
          <Link
            href="/refunds"
            className="mt-2 inline-block font-semibold text-brand-text underline underline-offset-4 transition-colors hover:text-neutral-600"
          >
            Returns &amp; Refunds Policy
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-2 border border-brand-border bg-brand-page p-4 text-sm text-brand-muted">
      <p className="mb-2 font-medium uppercase tracking-[0.08em] text-brand-text">
        Shipping Information
      </p>
      <p>We aim to ship within 24 hours (processing time, not delivery).</p>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2">
        <Link
          href="/shipping"
          className="font-semibold text-brand-text underline underline-offset-4 transition-colors hover:text-neutral-600"
        >
          Shipping Policy
        </Link>
        <Link
          href="/refunds"
          className="font-semibold text-brand-text underline underline-offset-4 transition-colors hover:text-neutral-600"
        >
          Returns &amp; Refunds Policy
        </Link>
      </div>
    </div>
  );
}
