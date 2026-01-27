// app/too-many-requests/page.tsx
"use client";

import { useRouter, useSearchParams } from "next/navigation";

export default function TooManyRequestsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const fromParam = searchParams.get("from");
  // Prevent open redirect: only allow same-origin paths
  const safeFrom = fromParam && fromParam.startsWith("/") ? fromParam : "/";

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-6">
      <main className="w-full max-w-3xl">
        <div className="rounded-2xl border border-zinc-800 bg-black/80 backdrop-blur px-6 py-8 sm:px-10 sm:py-10">
          <p className="text-[11px] uppercase tracking-[0.18em] text-red-400 text-center">
            Realdealkickzsc
          </p>

          <div className="mt-4 flex items-center justify-center text-[11px] uppercase tracking-[0.22em] text-zinc-400">
            <span>429</span>
            <span aria-hidden className="mx-3 text-zinc-600">
              •
            </span>
            <span>Cool down</span>
          </div>

          <h1 className="mt-6 text-3xl sm:text-4xl font-semibold tracking-tight text-center">
            Slow it down — we're restocking
          </h1>

          <p className="mt-4 text-center text-zinc-300 max-w-2xl mx-auto">
            You've sent too many requests in a short period. Please try again shortly.
          </p>

          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <a
              href="/"
              className="inline-flex items-center justify-center rounded-lg bg-white px-5 py-3 text-sm font-semibold text-black hover:bg-zinc-200 transition-colors"
            >
              Back to home
            </a>

            <button
              type="button"
              onClick={() => router.push(safeFrom)}
              className="inline-flex items-center justify-center rounded-lg border border-zinc-700 px-5 py-3 text-sm font-semibold text-zinc-100 hover:bg-zinc-900 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
