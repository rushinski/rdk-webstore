// app/error.tsx
"use client";

import { useEffect } from "react";

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
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-6">
      <main className="w-full max-w-3xl">
        <div className="rounded-2xl border border-zinc-800 bg-black/80 backdrop-blur px-6 py-8 sm:px-10 sm:py-10 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
          <p className="text-[11px] uppercase tracking-[0.18em] text-red-400 text-center">
            Realdealkickzsc
          </p>

          <div className="mt-4 flex items-center justify-center text-[11px] uppercase tracking-[0.22em] text-zinc-400">
            <span>500</span>
            <span aria-hidden className="mx-3 text-zinc-600">
              •
            </span>
            <span>System hiccup</span>
          </div>

          <h1 className="mt-6 text-3xl sm:text-5xl font-semibold tracking-tight text-center">
            Our server tripped on the laces
          </h1>

          <p className="mt-4 text-center text-zinc-300 max-w-2xl mx-auto">
            We're fixing it now. Give it another try, or head back to the store.
          </p>

          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => reset()}
              className="inline-flex items-center justify-center rounded-lg bg-white px-5 py-3 text-sm font-semibold text-black hover:bg-zinc-200 transition-colors focus:outline-none focus:ring-2 focus:ring-white/30"
            >
              Try again
            </button>

            <a
              href="/"
              className="inline-flex items-center justify-center rounded-lg border border-zinc-700 px-5 py-3 text-sm font-semibold text-zinc-100 hover:bg-zinc-900 transition-colors focus:outline-none focus:ring-2 focus:ring-white/20"
            >
              Back to home
            </a>
          </div>

          <div className="mt-6 text-center">
            <a
              href="/bug-report"
              className="text-sm text-zinc-400 hover:text-white underline underline-offset-4 transition-colors"
            >
              Think this is a bug? Report it.
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}