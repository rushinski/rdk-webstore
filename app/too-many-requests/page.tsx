"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { buttonStyles } from "@/components/ui/buttonStyles";

function TooManyRequestsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const fromParam = searchParams.get("from");
  const safeFrom = fromParam && fromParam.startsWith("/") ? fromParam : "/";

  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-page px-6">
      <main className="w-full max-w-3xl border border-brand-border bg-brand-surface px-6 py-10 sm:px-10">
        <p className="text-center text-[11px] uppercase tracking-[0.18em] text-brand-muted">
          solesneakers
        </p>

        <div className="mt-4 flex items-center justify-center text-[11px] uppercase tracking-[0.22em] text-brand-muted">
          <span>429</span>
          <span aria-hidden className="mx-3 text-brand-border">
            /
          </span>
          <span>Cool Down</span>
        </div>

        <h1 className="mt-6 text-center text-3xl font-semibold tracking-tight text-brand-text sm:text-4xl">
          Slow it down while we restock
        </h1>

        <p className="mx-auto mt-4 max-w-2xl text-center text-brand-muted">
          You&apos;ve sent too many requests in a short period. Please try again shortly.
        </p>

        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <a href="/" className={buttonStyles.primary}>
            Back to home
          </a>

          <button
            type="button"
            onClick={() => router.push(safeFrom)}
            className={buttonStyles.secondary}
          >
            Retry
          </button>
        </div>
      </main>
    </div>
  );
}

export default function TooManyRequestsPage() {
  return (
    <Suspense fallback={null}>
      <TooManyRequestsContent />
    </Suspense>
  );
}
