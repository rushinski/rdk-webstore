export function CheckoutLockedNotice({ message }: { message: string }) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="border border-brand-border bg-brand-surface p-6 shadow-[0_20px_60px_rgba(17,17,17,0.06)] sm:p-8">
        <p className="text-xs uppercase tracking-[0.2em] text-brand-muted">
          Checkout Locked
        </p>
        <h1 className="mt-3 text-2xl font-black uppercase tracking-[0.08em] text-brand-text sm:text-3xl">
          Payments are temporarily unavailable
        </h1>
        <p className="mt-4 text-sm text-brand-muted sm:text-base">{message}</p>
      </div>
    </div>
  );
}
