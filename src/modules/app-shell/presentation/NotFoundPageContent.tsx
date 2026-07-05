import Link from "next/link";

import { buttonStyles } from "@/components/ui/buttonStyles";

export function NotFoundPageContent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-page px-6">
      <main className="w-full max-w-3xl border border-brand-border bg-brand-surface px-6 py-10 sm:px-10">
        <p className="text-center text-[11px] uppercase tracking-[0.18em] text-brand-muted">
          solesneakers
        </p>

        <div className="mt-4 flex items-center justify-center text-[11px] uppercase tracking-[0.22em] text-brand-muted">
          <span>404</span>
          <span aria-hidden className="mx-3 text-brand-border">
            /
          </span>
          <span>Lost Page</span>
        </div>

        <h1 className="mt-6 text-center text-3xl font-semibold tracking-tight text-brand-text sm:text-5xl">
          This page is out of stock
        </h1>

        <p className="mx-auto mt-4 max-w-2xl text-center text-brand-muted">
          The link you followed doesn&apos;t exist anymore. Let&apos;s get you back to the
          collection.
        </p>

        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <Link href="/" className={buttonStyles.primary}>
            Back to home
          </Link>

          <Link href="/store" className={buttonStyles.secondary}>
            Shop new arrivals
          </Link>
        </div>

        <div className="mt-6 text-center">
          <Link
            href="/bug-report"
            className="text-sm text-brand-muted underline underline-offset-4 transition-colors hover:text-brand-text"
          >
            Think this is a bug? Report it.
          </Link>
        </div>
      </main>
    </div>
  );
}
