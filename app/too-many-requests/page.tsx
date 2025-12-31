'use client';

import Image from "next/image";

export default function TooManyRequestsPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="relative w-full h-[215px] overflow-hidden">
        <Image
          src="/images/errors/429.webp"
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
        <p className="text-xs uppercase tracking-[0.4em] text-zinc-500">
          Realdealkickzsc
        </p>
        <div className="inline-flex items-center gap-3">
          <span className="text-sm uppercase tracking-[0.3em] text-zinc-500">429</span>
          <span className="h-px w-10 bg-zinc-800" />
          <span className="text-sm uppercase tracking-[0.3em] text-zinc-500">Cool down</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold">Slow it down, we are restocking</h1>
        <p className="text-zinc-400">
          You are moving fast. Take a quick breather and try again in a moment.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <a
            href="/"
            className="px-4 py-2 rounded bg-white text-black text-sm font-semibold hover:bg-zinc-200 transition-colors"
          >
            Back to home
          </a>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded border border-zinc-700 text-sm text-zinc-200 hover:bg-zinc-900 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    </div>
  );
}
