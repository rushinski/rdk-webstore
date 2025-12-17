// app/not-found.tsx
import Link from "next/link";
import Image from "next/image";

export default function NotFound() {
  return (
    <main className="min-h-screen bg-neutral-50 text-neutral-900 flex items-center justify-center px-4">
      <div className="w-full max-w-3xl py-16 sm:py-24 flex flex-col items-center text-center">
        {/* Small label */}
        <p className="text-[11px] font-semibold tracking-[0.24em] uppercase text-red-500 mb-3">
          404 • Page not found
        </p>

        {/* Heading + copy */}
        <h1 className="text-2xl sm:text-3xl md:text-[32px] font-semibold mb-3">
          This pair isn&apos;t on the shelf.
        </h1>
        <p className="text-sm sm:text-base text-neutral-600 max-w-xl mb-10">
          We looked everywhere for this page and couldn't find it. The link might
          be broken or the drop has moved. Let's get you back to shopping real heat.
        </p>

        {/* Illustration */}
        <div className="w-full max-w-2xl mb-12">
          <div className="relative w-full overflow-hidden rounded-2xl shadow-sm">
            <Image
              src="/images/error-404.png"
              alt="Sneakerhead looking at a shelf of sneaker boxes with a large 404 in the background"
              width={1600}
              height={1000}
              className="w-full h-auto"
              priority
            />
          </div>
        </div>

        {/* CTA */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-full bg-red-600 hover:bg-red-500 px-6 py-2.5 text-sm sm:text-base font-medium text-white transition"
          >
            Back to home
          </Link>
        </div>

        {/* Footer */}
        <p className="mt-10 text-[11px] uppercase tracking-[0.24em] text-neutral-400">
          Real Deal Kickz • Always authentic, never fake.
        </p>
      </div>
    </main>
  );
}
