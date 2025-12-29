"use client";

import { useEffect } from "react";
import { logError } from "@/lib/log";

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
      <div className="max-w-xl text-center space-y-4">
        <p className="text-xs uppercase tracking-[0.4em] text-zinc-500">
          Real Deal Kickz
        </p>
        <div className="inline-flex items-center gap-3 justify-center">
          <span className="text-sm uppercase tracking-[0.3em] text-zinc-500">500</span>
          <span className="h-px w-10 bg-zinc-800" />
          <span className="text-sm uppercase tracking-[0.3em] text-zinc-500">System hiccup</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold">Our server tripped on the laces</h1>
        <p className="text-zinc-400">
          We are fixing it now. Give it another try or head back to the store.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="px-4 py-2 rounded bg-white text-black text-sm font-semibold hover:bg-zinc-200 transition-colors"
          >
            Try again
          </button>
          <a
            href="/"
            className="px-4 py-2 rounded border border-zinc-700 text-sm text-zinc-200 hover:bg-zinc-900 transition-colors"
          >
            Back to home
          </a>
        </div>
      </div>
    </div>
  );
}
