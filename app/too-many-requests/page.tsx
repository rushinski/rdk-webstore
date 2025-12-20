// app/too-many-requests/page.tsx
import Link from "next/link";
import Image from "next/image";

type TooManyRequestsPageProps = {
  searchParams?: {
    from?: string;
  };
};

export default function TooManyRequestsPage({
  searchParams,
}: TooManyRequestsPageProps) {
  const from = searchParams?.from;

  // Only allow internal paths (starts with "/"), otherwise fallback
  const safeFrom =
    typeof from === "string" && from.startsWith("/") ? from : "/";

  return (
    <main className="min-h-screen bg-neutral-50 text-neutral-900 flex items-center justify-center px-4">
      <div className="w-full max-w-3xl py-16 sm:py-24 flex flex-col items-center text-center">
        {/* Label */}
        <p className="text-[11px] font-semibold tracking-[0.24em] uppercase text-red-500 mb-3">
          429 • Too many requests
        </p>

        {/* Heading + copy */}
        <h1 className="text-2xl sm:text-3xl md:text-[32px] font-semibold mb-3">
          Slow down, sneakerhead.
        </h1>
        <p className="text-sm sm:text-base text-neutral-600 max-w-xl mb-3">
          We&apos;ve seen a few too many requests in a short time. To keep drops fair
          and protect your account, we&apos;ve paused things for a moment.
        </p>
        <p className="text-xs sm:text-sm text-neutral-500 max-w-xl mb-10">
          Wait a bit, then try that page again or head back home. If this wasn't
          you, consider resetting your password.
        </p>

        {/* Illustration */}
        <div className="w-full max-w-2xl mb-12">
          <div className="relative w-full overflow-hidden rounded-2xl shadow-sm">
            <Image
              src="/images/error-429.png"
              alt="Conveyor belt with sneaker boxes and a highlighted box, with a large 429 in the background"
              width={1600}
              height={1000}
              className="w-full h-auto"
            />
          </div>
        </div>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href={safeFrom}
            className="rounded-full bg-red-600 hover:bg-red-500 px-6 py-2.5 text-sm sm:text-base font-medium text-white transition"
          >
            Try that page again
          </Link>
          <Link
            href="/"
            className="rounded-full border border-neutral-300 bg-white px-6 py-2.5 text-sm sm:text-base font-medium text-neutral-900 hover:bg-neutral-100 transition"
          >
            Back to home
          </Link>
        </div>

        {/* Footer */}
        <p className="mt-10 text-[11px] uppercase tracking-[0.24em] text-neutral-400">
          Real Deal Kickz • Keeping drops fair for everyone.
        </p>
      </div>
    </main>
  );
}
