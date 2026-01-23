// app/too-many-requests/page.tsx
"use client";

import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";

export default function TooManyRequestsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const fromParam = searchParams.get("from");
  // Prevent open redirect: only allow same-origin paths
  const safeFrom = fromParam && fromParam.startsWith("/") ? fromParam : "/";

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="relative w-full h-[240px] overflow-hidden">
        <Image
          src="/images/errors/429.webp"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-black/55" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-black/70" />
      </div>

      <main className="mx-auto w-full max-w-3xl px-6 pb-16">
        <div className="relative -mt-10 sm:-mt-14 rounded-2xl border border-zinc-800 bg-black/80 backdrop-blur px-6 py-8 sm:px-10 sm:py-10">
          <p className="text-[11px] uppercase tracking-[0.18em] text-red-400 text-center sm:text-left">
            Realdealkickzsc
          </p>

          <div className="mt-4 flex items-center justify-center sm:justify-start text-[11px] uppercase tracking-[0.22em] text-zinc-400">
            <span>429</span>
            <span aria-hidden className="mx-3 text-zinc-600">
              •
            </span>
            <span>Cool down</span>
          </div>

          <h1 className="mt-6 text-3xl sm:text-4xl font-semibold tracking-tight text-center sm:text-left">
            Slow it down — we’re restocking
          </h1>

          <p className="mt-4 text-center sm:text-left text-zinc-300 max-w-2xl">
            You’re moving fast. Take a quick breather and try again in a moment.
          </p>

          <div className="mt-7 flex flex-wrap items-center justify-center sm:justify-start gap-3">
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
