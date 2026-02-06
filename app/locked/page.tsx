// app/locked/page.tsx
import Link from "next/link";
import Image from "next/image";

import { UnlockTimer } from "./unlock-timer";

// Ensure the page is never cached so the redirect logic works fresh
export const dynamic = "force-dynamic";

const SITE_UNLOCKS_AT_ISO: string | null = "2026-02-05T20:00:00-05:00";

function formatUnlock(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return iso;
  }
  return d.toLocaleString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

export default async function LockedPage(props: {
  searchParams?: Promise<{ next?: string }> | { next?: string };
}) {
  const sp = props.searchParams ? await Promise.resolve(props.searchParams) : undefined;
  const next = sp?.next || "/";

  const unlockFullDate = SITE_UNLOCKS_AT_ISO ? formatUnlock(SITE_UNLOCKS_AT_ISO) : "soon";

  return (
    <section className="relative w-full overflow-hidden">
      {/* Auto-redirect logic */}
      {SITE_UNLOCKS_AT_ISO && <UnlockTimer unlockAtIso={SITE_UNLOCKS_AT_ISO} />}

      {/* Page background: red/black gradient */}
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(120%_90%_at_50%_0%,rgba(220,38,38,0.35),transparent_60%),linear-gradient(to_bottom,rgba(0,0,0,0.98),rgba(0,0,0,0.92),rgba(220,38,38,0.10))]" />

      {/* Vignette for depth */}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(120%_120%_at_50%_60%,transparent_40%,rgba(0,0,0,0.92)_80%)]" />

      <div className="mx-auto flex min-h-[calc(100vh-0px)] w-full max-w-5xl items-center px-6 py-14">
        {/* Card: solid black */}
        <div className="relative w-full overflow-hidden rounded-3xl border-2 border-zinc-800/80 bg-black shadow-2xl">
          {/* subtle red top accent */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-red-500/70 to-transparent" />

          {/* soft red glow inside card */}
          <div className="pointer-events-none absolute -top-28 left-1/2 h-64 w-[32rem] -translate-x-1/2 rounded-full bg-red-600/12 blur-3xl" />

          <div className="relative px-8 py-12 sm:px-14 text-center">
            {/* Brand row */}
            <div className="mb-8 flex items-center justify-center gap-3">
              <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl border border-zinc-800/70 bg-black">
                <Image
                  src="/images/rdk-logo.png"
                  alt="Realdealkickzsc"
                  fill
                  sizes="44px"
                  className="object-contain p-2"
                  priority
                />
              </div>
              <div className="text-white font-extrabold text-lg sm:text-xl tracking-[0.12em]">
                REALDEALKICKZSC
              </div>
            </div>

            {/* Headline */}
            <h1 className="text-2xl sm:text-4xl font-semibold text-white">
              We’re not open yet
            </h1>

            <div className="mt-4 flex flex-col items-center gap-1">
              <p className="text-zinc-300 text-sm sm:text-base">
                The site unlocks in:{" "}
                <span className="text-red-500 font-mono font-bold">
                  {SITE_UNLOCKS_AT_ISO ? (
                    <UnlockTimer unlockAtIso={SITE_UNLOCKS_AT_ISO} />
                  ) : (
                    "soon"
                  )}
                </span>
              </p>
              <p className="text-zinc-500 text-xs italic">{unlockFullDate}</p>
            </div>

            {/* CTA */}
            <div className="mt-8 flex flex-col items-center gap-3">
              <Link
                href={`/auth/login?next=${encodeURIComponent(next)}`}
                className="inline-flex items-center justify-center rounded-xl bg-red-600 px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-red-700 hover:scale-105 shadow-lg shadow-red-600/25"
              >
                Admin login
              </Link>

              <p className="text-xs text-zinc-500">
                Not an admin? The site will refresh automatically at drop time.
              </p>
            </div>

            {/* Trust line */}
            <div className="mt-10 text-[11px] text-zinc-500 uppercase tracking-widest">
              Authentic sneakers • Secure checkout • Fast shipping
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
