// app/(errors)/too-many-requests/page.tsx
import Link from "next/link";

type TooManyRequestsPageProps = {
  searchParams?: {
    from?: string;
  };
};

export default function TooManyRequestsPage({ searchParams }: TooManyRequestsPageProps) {
  const from = searchParams?.from;

  // Only allow internal paths (starts with "/"), otherwise fallback
  const safeFrom =
    typeof from === "string" && from.startsWith("/") ? from : "/";

  return (
    <main className="min-h-screen bg-neutral-950 text-white flex items-center justify-center px-4">
      <div className="relative max-w-lg w-full text-center">
        {/* Background glow */}
        <div className="pointer-events-none absolute -top-36 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-red-600/20 blur-3xl" />

        {/* Badge */}
        <div className="relative inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-200 mb-6">
          <span className="h-6 w-6 rounded-full bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center text-xs font-bold">
            429
          </span>
          <span>You&apos;re moving too fast</span>
        </div>

        {/* Copy */}
        <h1 className="relative text-2xl sm:text-3xl font-semibold mb-3">
          Slow down, sneaker bot.
        </h1>
        <p className="relative text-sm sm:text-base text-neutral-300/85 mb-5">
          We&apos;ve seen a few too many requests in a short time. To keep drops fair and
          protect your account, we&apos;ve paused things for a moment.
        </p>

        <p className="relative text-xs text-neutral-400 mb-7">
          Please wait a bit, then try that page again or head back to the homepage. If this
          wasn&apos;t you, consider resetting your password.
        </p>

        {/* Actions - no onClick, pure links */}
        <div className="relative flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href={safeFrom}
            className="rounded-full bg-red-600 hover:bg-red-500 px-5 py-2.5 text-sm font-medium text-white transition"
          >
            Try that page again
          </Link>
          <Link
            href="/"
            className="rounded-full border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-medium text-neutral-100 hover:bg-white/10 transition"
          >
            Back to home
          </Link>
        </div>
      </div>
    </main>
  );
}
