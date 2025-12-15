// app/not-found.tsx
import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen bg-neutral-950 text-white flex items-center justify-center px-4">
      <div className="relative max-w-3xl w-full flex flex-col items-center text-center">
        {/* Background glow */}
        <div className="pointer-events-none absolute -top-40 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-red-600/25 blur-3xl" />
        <div className="pointer-events-none absolute bottom-[-6rem] right-10 h-72 w-72 rounded-full bg-red-900/40 blur-3xl" />

        {/* “Sneaker box in the desert” style hero */}
        <div className="relative mb-8 flex flex-col items-center gap-4">
          <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-200">
            <span className="h-6 w-6 rounded-full bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center text-xs font-bold">
              404
            </span>
            <span>This drop couldn&apos;t be found</span>
          </div>

          {/* Simple “box” illustration */}
          <div className="mt-2 flex flex-col items-center">
            <div className="relative h-24 w-40">
              {/* Box top */}
              <div className="absolute inset-x-4 top-0 h-8 rounded-xl bg-gradient-to-br from-neutral-200 to-neutral-400" />
              {/* Box front */}
              <div className="absolute bottom-0 inset-x-0 h-16 rounded-2xl bg-gradient-to-br from-neutral-800 to-neutral-900 border border-white/10" />
              {/* Shoe silhouette */}
              <div className="absolute -top-4 right-6 h-8 w-16 rounded-full bg-gradient-to-r from-red-500 to-red-700 blur-[1px]" />
            </div>
          </div>
        </div>

        {/* Copy */}
        <div className="relative space-y-3">
          <h1 className="text-3xl sm:text-4xl font-semibold">
            This pair isn&apos;t on the shelf.
          </h1>
          <p className="text-sm sm:text-base text-neutral-300/85 max-w-xl mx-auto">
            The page you&apos;re looking for doesn&apos;t exist, was moved, or the link is
            slightly cooked. Let&apos;s get you back to shopping real heat.
          </p>
        </div>

        {/* Actions */}
        <div className="relative mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-full bg-red-600 hover:bg-red-500 px-5 py-2.5 text-sm font-medium text-white transition"
          >
            Back to home
          </Link>
        </div>

        {/* Small footer hint */}
        <p className="relative mt-6 text-[11px] uppercase tracking-[0.18em] text-neutral-500">
          RealDealKickz • Always authentic, never fake.
        </p>
      </div>
    </main>
  );
}
