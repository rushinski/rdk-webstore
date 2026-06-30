"use client";

import { useEffect } from "react";

import { buttonStyles } from "@/components/ui/buttonStyles";
import { logError } from "@/lib/utils/log";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logError(error, { layer: "frontend", event: "error_boundary" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-page px-6">
      <main className="w-full max-w-3xl border border-brand-border bg-brand-surface px-6 py-10 sm:px-10">
        <p className="text-center text-[11px] uppercase tracking-[0.18em] text-brand-muted">
          solesneakers
        </p>

        <div className="mt-4 flex items-center justify-center text-[11px] uppercase tracking-[0.22em] text-brand-muted">
          <span>500</span>
          <span aria-hidden className="mx-3 text-brand-border">
            /
          </span>
          <span>System Error</span>
        </div>

        <h1 className="mt-6 text-center text-3xl font-semibold tracking-tight text-brand-text sm:text-5xl">
          The server tripped on the laces
        </h1>

        <p className="mx-auto mt-4 max-w-2xl text-center text-brand-muted">
          We&apos;re fixing it now. Give it another try, or head back to the store.
        </p>

        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <button type="button" onClick={reset} className={buttonStyles.primary}>
            Try again
          </button>

          <a href="/" className={buttonStyles.secondary}>
            Back to home
          </a>
        </div>

        <div className="mt-6 text-center">
          <a
            href="/bug-report"
            className="text-sm text-brand-muted underline underline-offset-4 transition-colors hover:text-brand-text"
          >
            Think this is a bug? Report it.
          </a>
        </div>
      </main>
    </div>
  );
}
