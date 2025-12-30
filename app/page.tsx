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
      {/* HERO */}
      <section className="relative bg-black overflow-hidden">
        <div className="relative min-h-[78vh] flex items-center pb-24">
          {/* Background */}
          <div className="absolute inset-0 pointer-events-none">
            {/* Image: moved UP so you see more above the head */}
            <div
              className="absolute inset-0 bg-cover"
              style={{
                backgroundImage: "url(/images/home/hero-inventory.png)",
                backgroundPosition: "center 30%", // <-- move UP (smaller % = higher)
                filter: "grayscale(1) contrast(1.12) brightness(0.55)",
              }}
            />

            {/* Sharp readability ramp */}
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(90deg, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.84) 40%, rgba(0,0,0,0.35) 72%, rgba(0,0,0,0.78) 100%)",
              }}
            />

            {/* Controlled red accent */}
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(135deg, rgba(220,38,38,0.18) 0%, rgba(0,0,0,0) 44%)",
              }}
            />

            {/* Hairline accent */}
            <div className="absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-transparent via-red-600/80 to-transparent" />

            {/* Vignette */}
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

                {/* Simple hours link */}
                <div className="mt-6">
                  <Link
                    href="/hours"
                    className="text-sm text-gray-300 hover:text-white underline underline-offset-4 cursor-pointer"
                  >
                    See pickup hours &amp; meetup details →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* OVERLAY CATEGORY CARDS */}
        <div className="relative z-20 -mt-20 md:-mt-24">
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
                  className="
                    group relative overflow-hidden bg-black border border-zinc-800
                    h-36 sm:h-44 lg:h-52
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 cursor-pointer
                    shadow-[0_18px_40px_rgba(0,0,0,0.55)]
                    hover:shadow-[0_22px_55px_rgba(0,0,0,0.70)]
                    transition-shadow
                  "
                >
                  {/* Color default, grayscale on hover */}
                  <div
                    className="absolute inset-0 bg-center bg-cover transition-all duration-500 ease-out
                               group-hover:scale-110 filter grayscale-0 group-hover:grayscale group-hover:brightness-75"
                    style={{ backgroundImage: `url(${c.image})` }}
                  />

                  {/* Readability overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-black/10" />

                  {/* Red baseline accent on hover */}
                  <div className="absolute left-0 right-0 bottom-0 h-px bg-red-600/0 group-hover:bg-red-600/70 transition-colors" />

                  <div className="absolute bottom-4 left-4 right-4">
                    <h3 className="text-xl font-bold text-white">{c.label}</h3>
                    <p className="text-gray-200 text-sm group-hover:text-white transition-colors">
                      Explore →
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Spacer so overlay doesn't collide with whatever comes next */}
      <div className="h-10 md:h-14" />
    </div>
  );
}
