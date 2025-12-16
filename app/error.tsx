// app/error.tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect } from "react";

type ErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    // TODO: integrate with Sentry / PostHog later
    console.error(error);
  }, [error]);

  return (
    <main className="min-h-screen bg-neutral-50 text-neutral-900 flex items-center justify-center px-4">
      <div className="w-full max-w-3xl py-16 sm:py-24 flex flex-col items-center text-center">
        {/* Label */}
        <p className="text-[11px] font-semibold tracking-[0.24em] uppercase text-red-500 mb-3">
          500 • Something went wrong
        </p>

        {/* Heading + copy */}
        <h1 className="text-2xl sm:text-3xl md:text-[32px] font-semibold mb-3">
          We slipped up on this drop.
        </h1>
        <p className="text-sm sm:text-base text-neutral-600 max-w-xl mb-10">
          An unexpected error stopped this page from loading. The issue&apos;s on our
          side, not yours. You can try again, or head home and keep browsing real heat.
        </p>

        {/* Illustration */}
        <div className="w-full max-w-2xl mb-12">
          <div className="relative w-full overflow-hidden rounded-2xl shadow-sm">
            <Image
              src="/images/error-500-broken-lace.png"
              alt="Broken sneaker lace with a large 500 in the background"
              width={1600}
              height={1000}
              className="w-full h-auto"
              priority
            />
          </div>
        </div>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center justify-center rounded-full bg-red-600 hover:bg-red-500 px-6 py-2.5 text-sm sm:text-base font-medium text-white transition"
          >
            Try again
          </button>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-full border border-neutral-300 bg-white px-6 py-2.5 text-sm sm:text-base font-medium text-neutral-900 hover:bg-neutral-100 transition"
          >
            Back to home
          </Link>
        </div>

        {/* Footer */}
        <p className="mt-10 text-[11px] uppercase tracking-[0.24em] text-neutral-400">
          Real Deal Kickz • Error logs, not excuses.
        </p>
      </div>
    </main>
  );
}
