"use client";

import Image from "next/image";
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
    <div className="min-h-screen bg-black text-white">
      <div className="relative w-full h-[215px] overflow-hidden">
        <Image
          src="/images/errors/500.webp"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/70 to-black/10" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/40" />
        <div className="absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-transparent via-zinc-700/70 to-transparent" />
      </div>

      <div className="mx-auto w-full max-w-2xl px-6 py-10 text-left space-y-4">
        <p className="text-xs uppercase tracking-[0.3em] text-red-400">
          Realdealkickzsc
        </p>
        <div className="inline-flex items-center gap-3">
          <span className="text-sm uppercase tracking-[0.3em] text-zinc-400">500</span>
          <span className="h-px w-10 bg-zinc-800" />
          <span className="text-sm uppercase tracking-[0.3em] text-zinc-400">System hiccup</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-bold">Our server tripped on the laces</h1>
        <p className="text-zinc-300 max-w-xl">
          We are fixing it now. Give it another try or head back to the store.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="px-5 py-3 rounded bg-white text-black text-sm font-semibold hover:bg-zinc-200 transition-colors"
          >
            Try again
          </button>
          <a
            href="/"
            className="px-5 py-3 rounded border border-zinc-700 text-sm text-zinc-200 hover:bg-zinc-900 transition-colors"
          >
            Back to home
          </a>
        </div>
        <a href="/bug-report" className="text-sm text-zinc-400 hover:text-white transition-colors">
          Think this is a bug? Report it.
        </a>
      </div>
    </div>
  );
}
