"use client";

import Link from "next/link";
import { useEffect } from "react";

import { logError } from "@/lib/utils/log";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logError(error, {
      layer: "frontend",
      event: "store_error",
      digest: error.digest ?? null,
    });
  }, [error]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-20 text-center">
      <h1 className="mb-3 text-3xl font-black uppercase tracking-[0.08em] text-brand-text">
        Something went wrong
      </h1>
      <p className="mb-8 text-brand-muted">
        We could not load the store. Try again or head back to browsing.
      </p>
      <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
        <button
          type="button"
          onClick={() => reset()}
          className="border border-brand-text bg-brand-text px-6 py-3 text-sm font-semibold uppercase tracking-[0.08em] text-brand-surface transition-colors hover:bg-neutral-800"
        >
          Try again
        </button>
        <Link
          href="/store"
          className="border border-brand-border bg-brand-surface px-6 py-3 text-sm font-semibold uppercase tracking-[0.08em] text-brand-text transition-colors hover:border-brand-text hover:bg-brand-page"
        >
          Back to store
        </Link>
      </div>
    </div>
  );
}
