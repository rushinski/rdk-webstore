export function CheckoutLockedNotice({ message }: { message: string }) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="rounded-2xl border border-zinc-800/70 bg-zinc-900 p-6 sm:p-8">
        <p className="text-xs uppercase tracking-[0.2em] text-red-400">Checkout Locked</p>
        <h1 className="mt-3 text-2xl font-semibold text-white sm:text-3xl">
          Payments are temporarily unavailable
        </h1>
        <p className="mt-4 text-sm text-zinc-300 sm:text-base">{message}</p>
      </div>
    </div>
  );
}
