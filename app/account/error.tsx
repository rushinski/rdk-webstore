"use client";

import Link from "next/link";
import { useEffect } from "react";

import { logError } from "@/lib/log";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logError(error, {
      layer: "frontend",
      event: "account_error",
      digest: error.digest ?? null,
    });
  }, [error]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-20 text-center">
      <h1 className="text-3xl font-bold text-white mb-3">Account error</h1>
      <p className="text-zinc-400 mb-8">
        We could not load your account details. Try again or sign in again.
      </p>
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded"
        >
          Try again
        </button>
        <Link
          href="/auth/login"
          className="px-6 py-3 bg-zinc-900 border border-zinc-800 text-zinc-200 hover:text-white rounded"
        >
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
