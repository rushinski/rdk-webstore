"use client";

import Link from "next/link";
import { useEffect } from "react";

import { adminButtonStyles } from "@/components/admin/ui/adminButtonStyles";
import { logError } from "@/lib/utils/log";

export function AdminErrorPageContent({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logError(error, {
      layer: "frontend",
      event: "admin_error",
      digest: error.digest ?? null,
    });
  }, [error]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-20 text-center">
      <h1 className="mb-3 text-3xl font-bold uppercase tracking-[0.08em] text-brand-text">
        Admin error
      </h1>
      <p className="mb-8 text-brand-muted">
        We hit an issue loading the admin console. Try again or return to the dashboard.
      </p>
      <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
        <button
          type="button"
          onClick={() => reset()}
          className={adminButtonStyles.primary}
        >
          Try again
        </button>
        <Link href="/admin/dashboard" className={adminButtonStyles.secondary}>
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
