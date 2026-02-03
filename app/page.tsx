import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { FeaturedItems } from "@/components/home/FeaturedItems";

const categories = [
  { slug: "sneakers", label: "Sneakers", image: "/images/home/sneakers.png" },
  { slug: "clothing", label: "Clothing", image: "/images/home/clothing.png" },
  {
    slug: "accessories",
    label: "Accessories",
    image: "/images/home/accessories.png",
  },
  {
    slug: "electronics",
    label: "Electronics",
    image: "/images/home/electronics.png",
  },
];

export default function HomePage() {
  return (
    <div className="relative">
      <section className="relative bg-black overflow-visible">
        {/* HERO (image + content) */}
        <div className="relative min-h-[78vh] flex items-start md:items-center">
          {/* Background */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <Image
              src="/images/home/hero-inventory-2025-02.webp"
              alt=""
              fill
              priority
              sizes="100vw"
              quality={90}
              className="object-cover object-[45%_45%] sm:object-[60%_20%] lg:object-[45%_25%]"
              style={{ filter: "contrast(1.06) brightness(0.82)" }}
            />

            {/* Left content column fade */}
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(90deg, rgba(0,0,0,0.90) 0%, rgba(0,0,0,0.80) 34%, rgba(0,0,0,0.48) 52%, rgba(0,0,0,0.00) 70%)",
              }}
            />

            {/* Global vignette */}
            <div
              className="absolute inset-0"
              style={{
                background:
                  "radial-gradient(85% 70% at 50% 45%, rgba(0,0,0,0) 0%, rgba(0,0,0,0.55) 65%, rgba(0,0,0,0.85) 100%)",
              }}
            />

            {/* Hairline accent */}
            <div className="absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-transparent via-zinc-700/70 to-transparent" />
          </div>

          {/* Content (✅ padding-bottom lives here, NOT on the hero container) */}
          <div className="relative z-10 w-full">
            <div className="max-w-7xl mx-auto px-4 pt-8 sm:pt-16 md:py-28 pb-44 sm:pb-52 md:pb-60">
              <div className="max-w-2xl">
                <div className="text-[11px] sm:text-xs uppercase tracking-[0.2em] text-red-400 font-semibold mb-2 sm:mb-3">
                  REALDEALKICKZSC
                </div>

                <h1 className="text-[2.75rem] sm:text-5xl md:text-7xl font-bold text-white tracking-tight leading-[0.95] mb-[22vh] sm:mb-0">
                  AUTHENTIC.
                  <br />
                  VERIFIED.
                  <br />
                  READY.
                </h1>

                <div className="mt-6 sm:mt-10 grid grid-cols-2 gap-3 sm:flex sm:flex-row">
                  <Link
                    href="/store"
                    className="inline-flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold
                              px-3 py-3 text-sm sm:px-8 sm:py-4 sm:text-base
                              transition-colors cursor-pointer"
                  >
                    Shop Now
                    <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
                  </Link>

                  <Link
                    href="/contact"
                    className="inline-flex items-center justify-center gap-2 border border-red-600 text-white hover:bg-red-600 font-bold
                              px-3 py-3 text-sm sm:px-8 sm:py-4 sm:text-base
                              transition-colors cursor-pointer"
                  >
                    Looking to Sell?
                    <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
                  </Link>
                </div>

                <p className="mt-4 sm:mt-6 text-sm sm:text-lg md:text-xl text-gray-300 max-w-xl">
                  Sneakers &amp; streetwear you can trust: curated inventory, clear
                  condition, and a straight-to-the-point buying experience.
                </p>

                <div className="mt-3 sm:mt-4">
                  <Link
                    href="/hours"
                    className="text-xs sm:text-sm text-gray-300 hover:text-white transition-colors cursor-pointer"
                  >
                    See pickup hours &amp; meetup details →
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* ✅ FEATURED ITEMS OVERLAY (half on / half off the hero image) */}
          <div className="absolute left-0 right-0 bottom-0 z-20 translate-y-[55%] sm:translate-y-[65%] md:translate-y-[60%]">
            <div className="max-w-7xl mx-auto px-4">
              <FeaturedItems embedded />
            </div>
          </div>
        </div>
      </section>

      {/* Spacer so the overlay (translated down) doesn't collide with next section */}
      <div className="h-[280px] sm:h-[340px] md:h-[380px] lg:h-[420px] bg-black" />

      {/* Decorative Divider - closer to Featured Items */}
      <div className="bg-black md:pt-6 pb-16 md:pb-24">
        <div className="max-w-7xl mx-auto px-4">
          <div className="relative">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <div className="w-full border-t border-zinc-800"></div>
            </div>
            <div className="relative flex justify-center">
              <span className="bg-black px-6 text-sm text-gray-400 uppercase tracking-wider">
                Explore Our Collection
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* SHOP BY CATEGORY (below) */}
      <section className="bg-black pb-12 md:pb-16">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-end justify-between mb-6 md:mb-8">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-2">
                Shop by Category
              </h2>
              <p className="text-gray-400 text-sm md:text-base">
                Browse our curated collections
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {categories.map((c) => (
              <Link
                key={c.slug}
                href={`/store?category=${c.slug}`}
                aria-label={`Shop ${c.label}`}
                className="
                  group relative overflow-hidden bg-black border border-zinc-800
                  h-48 sm:h-56 lg:h-64
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 cursor-pointer
                  shadow-[0_18px_40px_rgba(0,0,0,0.55)]
                  hover:shadow-[0_22px_55px_rgba(0,0,0,0.70)]
                  transition-shadow
                "
              >
                <div
                  className="absolute inset-0 bg-center bg-cover transition-all duration-500 ease-out
                             group-hover:scale-110 grayscale-0 group-hover:grayscale group-hover:brightness-75"
                  style={{ backgroundImage: `url(${c.image})` }}
                />

                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-black/10" />
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
      </section>
    </div>
  );
}