// app/(main)/page.tsx
import Link from "next/link";
import { ArrowRight } from "lucide-react";

const categories = [
  { slug: "sneakers", label: "Sneakers", image: "/images/home/sneakers.png" },
  { slug: "clothing", label: "Clothing", image: "/images/home/clothing.png" },
  { slug: "accessories", label: "Accessories", image: "/images/home/accessories.png" },
  { slug: "electronics", label: "Electronics", image: "/images/home/electronics.png" },
];

export default async function HomePage() {
  return (
    <div className="relative">
      {/* Hero */}
      <section className="relative overflow-hidden bg-black">
        <div className="relative min-h-[78vh] flex items-center">
          {/* Background image + sharp overlays */}
          <div className="absolute inset-0 pointer-events-none">
            {/* Photo */}
            <div
              className="absolute inset-0 bg-center bg-cover"
              style={{
                backgroundImage: "url(/images/home/hero-inventory.png)",
                filter: "grayscale(1) contrast(1.1) brightness(0.55)",
              }}
            />

            {/* Hard readability ramp (left = black, right = image) */}
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(90deg, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.84) 38%, rgba(0,0,0,0.35) 68%, rgba(0,0,0,0.70) 100%)",
              }}
            />

            {/* Crisp red accent (subtle, controlled) */}
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(135deg, rgba(220,38,38,0.20) 0%, rgba(0,0,0,0) 42%)",
              }}
            />

            {/* Thin red hairline (ties to CTA, sharp visual language) */}
            <div className="absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-transparent via-red-600/80 to-transparent" />

            {/* Corner brackets (unique + minimal, not a random strip) */}
            <div className="absolute left-6 top-6 h-10 w-10 border-l border-t border-zinc-700/80" />
            <div className="absolute left-6 top-6 h-6 w-6 border-l border-t border-red-600/70" />
            <div className="absolute right-6 bottom-6 h-10 w-10 border-r border-b border-zinc-700/80" />
            <div className="absolute right-6 bottom-6 h-6 w-6 border-r border-b border-red-600/70" />

            {/* Subtle vignette (keeps edges tight) */}
            <div
              className="absolute inset-0"
              style={{
                background:
                  "radial-gradient(85% 70% at 50% 45%, rgba(0,0,0,0) 0%, rgba(0,0,0,0.55) 65%, rgba(0,0,0,0.85) 100%)",
              }}
            />
          </div>

          {/* Content */}
          <div className="relative z-10 w-full">
            <div className="max-w-7xl mx-auto px-4 py-24 md:py-28">
              <div className="max-w-2xl">
                <div className="text-xs tracking-[0.35em] text-red-500 font-semibold mb-4">
                  REALDEALKICKZSC
                </div>

                {/* Statement headline (not just brand name) */}
                <h1 className="text-5xl md:text-7xl font-bold text-white tracking-tight leading-[0.95]">
                  AUTHENTIC.
                  <br />
                  VERIFIED.
                  <br />
                  READY.
                </h1>

                <p className="mt-6 text-lg md:text-xl text-gray-300 max-w-xl">
                  Sneakers &amp; streetwear you can trust — curated inventory, clear condition, and a
                  straight-to-the-point buying experience.
                </p>

                <div className="mt-10 flex flex-col sm:flex-row gap-3">
                  <Link
                    href="/store"
                    className="inline-flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold px-8 py-4 transition-colors cursor-pointer"
                  >
                    Shop Now
                    <ArrowRight className="w-5 h-5" />
                  </Link>

                  <Link
                    href="/contact"
                    className="inline-flex items-center justify-center gap-2 border border-red-600 text-white hover:bg-red-600 font-bold px-8 py-4 transition-colors cursor-pointer"
                  >
                    Looking to Sell?
                    <ArrowRight className="w-5 h-5" />
                  </Link>
                </div>

                {/* “Popup” style badges (sharp cards, no blur, matches your site) */}
                <div className="mt-10 flex flex-wrap gap-3">
                  <div className="px-3 py-2 bg-black/70 border border-zinc-800 text-gray-200 text-sm">
                    Verified inventory
                  </div>
                  <div className="px-3 py-2 bg-black/70 border border-zinc-800 text-gray-200 text-sm">
                    Fast responses
                  </div>
                  <div className="px-3 py-2 bg-black/70 border border-zinc-800 text-gray-200 text-sm">
                    Local pickup available
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Overlapping Category “popups” (like your example #3) */}
        <div className="relative z-20 -mt-14 md:-mt-16 pb-8">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex items-end justify-between mb-6">
              <h2 className="text-3xl md:text-4xl font-bold text-white">Shop by Category</h2>
              <Link
                href="/store"
                className="hidden md:inline-flex items-center gap-2 text-gray-300 hover:text-white transition-colors cursor-pointer"
              >
                View all <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {categories.map((c) => (
                <Link
                  key={c.slug}
                  href={`/store?category=${c.slug}`}
                  aria-label={`Shop ${c.label}`}
                  className="group relative overflow-hidden bg-black border border-zinc-800 h-36 sm:h-44 lg:h-48 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 cursor-pointer"
                >
                  {/* Image */}
                  <div
                    className="absolute inset-0 bg-center bg-cover transition-all duration-500 ease-out group-hover:scale-110"
                    style={{
                      backgroundImage: `url(${c.image})`,
                      filter: "grayscale(1) contrast(1.05) brightness(0.7)",
                    }}
                  />

                  {/* Sharp overlay + red edge accent on hover */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/25" />
                  <div className="absolute left-0 right-0 bottom-0 h-px bg-red-600/0 group-hover:bg-red-600/70 transition-colors" />

                  <div className="absolute bottom-4 left-4 right-4">
                    <h3 className="text-xl font-bold text-white">{c.label}</h3>
                    <p className="text-gray-300 text-sm group-hover:text-white transition-colors">
                      Explore →
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Info Links */}
      <div className="bg-zinc-900 border-t border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Link
              href="/hours"
              className="group p-8 bg-black border border-zinc-800 hover:border-red-600 transition-colors cursor-pointer"
            >
              <h3 className="text-2xl font-bold text-white mb-3 group-hover:text-red-500 transition-colors">
                Hours &amp; Pickups
              </h3>
              <p className="text-gray-400">
                View our pickup hours, local meetup details, and how to reach us.
              </p>
            </Link>

            <Link
              href="/contact"
              className="group p-8 bg-black border border-zinc-800 hover:border-red-600 transition-colors cursor-pointer"
            >
              <h3 className="text-2xl font-bold text-white mb-3 group-hover:text-red-500 transition-colors">
                Contact Us
              </h3>
              <p className="text-gray-400">
                Have questions? Get in touch with our team for support and inquiries.
              </p>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
