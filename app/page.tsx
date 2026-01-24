// app/page.tsx
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

const categories = [
  { slug: "sneakers", label: "Sneakers", image: "/images/home/sneakers.png" },
  { slug: "clothing", label: "Clothing", image: "/images/home/clothing.png" },
  { slug: "accessories", label: "Accessories", image: "/images/home/accessories.png" },
  { slug: "electronics", label: "Electronics", image: "/images/home/electronics.png" },
];

export default function HomePage() {
  return (
    <div className="relative">
      <section className="relative bg-black overflow-hidden">
        <div className="relative min-h-[78vh] flex items-start md:items-center pb-24">
          {/* Background */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {/* Hero image */}
            <Image
              src="/images/home/hero-inventory-2025-02.webp"
              alt=""
              fill
              priority
              sizes="100vw"
              quality={90}
              className="object-cover object-[80%_20%] sm:object-[60%_20%] lg:object-[45%_25%]"
              style={{ filter: "contrast(1.06) brightness(0.82)" }}
            />

            {/* Left content column (makes text readable + avoids overlapping the client visually) */}
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

          {/* Content */}
          <div className="relative z-10 w-full">
            <div className="max-w-7xl mx-auto px-4 pt-12 pb-24 sm:pt-16 md:py-28">
              <div className="max-w-2xl">
                <div className="text-xs uppercase tracking-[0.2em] text-red-400 font-semibold mb-3">
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
                  Sneakers &amp; streetwear you can trust: curated inventory, clear
                  condition, and a straight-to-the-point buying experience.
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

                {/* Hours link: no underline, slightly closer to CTAs */}
                <div className="mt-4">
                  <Link
                    href="/hours"
                    className="text-sm text-gray-300 hover:text-white transition-colors cursor-pointer"
                  >
                    See pickup hours &amp; meetup details →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* OVERLAY CATEGORY CARDS */}
        <div className="relative z-20 -mt-28 md:-mt-32">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex items-end justify-between mb-6">
              <h2 className="text-3xl md:text-4xl font-bold text-white">
                Shop by Category
              </h2>
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
                  {/* Full color default, grayscale on hover */}
                  <div
                    className="absolute inset-0 bg-center bg-cover transition-all duration-500 ease-out
                               group-hover:scale-110 grayscale-0 group-hover:grayscale group-hover:brightness-75"
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

      {/* Spacer so overlay doesn't collide with next sections */}
      <div className="h-10 md:h-14" />
    </div>
  );
}
