// app/error.tsx
"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // TODO: integrate with Sentry/PostHog later
    console.error(error);
  }, [error]);

  return (
    <main className="min-h-screen bg-neutral-950 text-white flex items-center justify-center px-4">
      <div className="relative max-w-3xl w-full flex flex-col items-center text-center">
        {/* Background glows */}
        <div className="pointer-events-none absolute -top-40 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-red-600/25 blur-3xl" />
        <div className="pointer-events-none absolute bottom-[-6rem] right-10 h-72 w-72 rounded-full bg-red-900/40 blur-3xl" />

        {/* Hero badge */}
        <div className="relative mb-8 flex flex-col items-center gap-4">
          <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-200">
            <span className="h-6 w-6 rounded-full bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center text-xs font-bold">
              500
            </span>
            <span>Something went off-track</span>
          </div>

          {/* Simple "broken sneaker box" illustration */}
          <div className="mt-2 flex flex-col items-center">
            <div className="relative h-28 w-44">
              {/* Shadow */}
              <div className="absolute inset-x-6 bottom-0 h-6 rounded-full bg-black/40 blur-md" />
              {/* Box back */}
              <div className="absolute inset-x-4 top-2 h-8 rounded-xl bg-gradient-to-br from-neutral-300 to-neutral-500" />
              {/* Box front */}
              <div className="absolute inset-x-1 bottom-2 h-16 rounded-2xl bg-gradient-to-br from-neutral-900 to-neutral-800 border border-white/10" />
              {/* Tilted lid */}
              <div className="absolute -top-1 -left-2 h-4 w-24 rotate-[-6deg] rounded-lg bg-gradient-to-br from-neutral-400 to-neutral-200" />
              {/* Fallen sneaker silhouette */}
              <div className="absolute -right-1 -bottom-1 h-10 w-18 rotate-[12deg] rounded-full bg-gradient-to-r from-red-500 to-red-700 blur-[1px]" />
            </div>
          </div>
        </div>

        {/* Copy */}
        <div className="relative space-y-3 max-w-xl mx-auto">
          <h1 className="text-3xl sm:text-4xl font-semibold">
            We dropped the ball on this one.
          </h1>
          <p className="text-sm sm:text-base text-neutral-300/85">
            An unexpected error stopped this page from loading. The issue is on our side,
            not yours. You can try again or head back and keep browsing real heat.
          </p>
        </div>

        {/* Actions */}
        <div className="relative mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center justify-center rounded-full bg-white text-neutral-900 px-5 py-2.5 text-sm font-medium hover:bg-neutral-200 transition"
          >
            Try again
          </button>

          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-medium text-neutral-100 hover:bg-white/10 transition"
          >
            Back to home
          </Link>
        </div>

        {/* Tiny footer */}
        <p className="relative mt-6 text-[11px] uppercase tracking-[0.18em] text-neutral-500">
          Real Deal Kickz • Error logs, not excuses.
        </p>
      </div>
    </main>
  );
}
