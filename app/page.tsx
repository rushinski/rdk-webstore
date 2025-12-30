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
      {/* Hero Section */}
      <div className="relative min-h-[85vh] flex items-center bg-gradient-to-br from-black via-zinc-900 to-black overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(60% 45% at 30% 30%, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.04) 30%, rgba(0,0,0,0) 65%)",
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(90% 70% at 70% 55%, rgba(0,0,0,0) 0%, rgba(0,0,0,0.35) 70%, rgba(0,0,0,0.7) 100%)",
            }}
          />
        </div>

        <div className="absolute inset-0 pointer-events-none opacity-[0.10]">
          <div className="absolute inset-0 noise-overlay" />
        </div>

        <div className="relative z-10 w-full max-w-7xl mx-auto px-4 py-20 grid lg:grid-cols-[1.1fr_0.9fr] gap-12 items-center">
          <div>
            <p className="text-xs uppercase tracking-[0.5em] text-zinc-500">Real Deal Kickz SC</p>
            <h1 className="text-5xl md:text-7xl font-bold text-white mt-6 leading-[1.05]">
              Verified kicks.
              <br />
              Clean fits.
              <br />
              Zero fluff.
            </h1>
            <p className="text-lg md:text-xl text-zinc-400 mt-6 max-w-xl">
              Authentic sneakers and streetwear, curated daily. Built for collectors, stylists, and people who move fast.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                href="/store"
                className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold px-8 py-4 transition-colors cursor-pointer"
              >
                Shop Now
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                href="/hours"
                className="inline-flex items-center gap-2 border border-zinc-700 text-white px-6 py-3 text-sm font-semibold uppercase tracking-[0.2em] hover:border-red-600/60 hover:text-red-100 transition-colors"
              >
                Pickups
              </Link>
            </div>
            <div className="mt-10 flex flex-wrap items-center gap-6 text-[11px] uppercase tracking-[0.3em] text-zinc-500">
              <span className="flex items-center gap-2">
                <span className="h-px w-6 bg-red-600" />
                Authenticated
              </span>
              <span className="flex items-center gap-2">
                <span className="h-px w-6 bg-red-600" />
                Local pickup
              </span>
              <span className="flex items-center gap-2">
                <span className="h-px w-6 bg-red-600" />
                Fast ship
              </span>
            </div>
          </div>

          <div className="relative hidden lg:block h-[420px]">
            <div
              className="absolute right-6 top-6 h-64 w-52 border border-zinc-800/80 bg-zinc-900 shadow-2xl -rotate-6"
              style={{ backgroundImage: "url(/images/home/sneakers.png)", backgroundSize: "cover", backgroundPosition: "center" }}
            />
            <div
              className="absolute left-8 top-16 h-56 w-44 border border-zinc-800/80 bg-zinc-900 shadow-2xl rotate-4"
              style={{ backgroundImage: "url(/images/home/clothing.png)", backgroundSize: "cover", backgroundPosition: "center" }}
            />
            <div
              className="absolute right-20 bottom-6 h-52 w-40 border border-zinc-800/80 bg-zinc-900 shadow-2xl -rotate-2"
              style={{ backgroundImage: "url(/images/home/accessories.png)", backgroundSize: "cover", backgroundPosition: "center" }}
            />
          </div>
        </div>
      </div>

      {/* Category Preview */}
      <div className="max-w-7xl mx-auto px-4 py-20">
        <h2 className="text-4xl font-bold text-white mb-12 text-center">Shop by Category</h2>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {categories.map((c) => (
            <Link
              key={c.slug}
              href={`/store?category=${c.slug}`}
              aria-label={`Shop ${c.label}`}
              className="group relative overflow-hidden bg-zinc-900 h-44 sm:h-56 lg:h-64 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 cursor-pointer"
            >
              {/* Background image */}
              <div
                className="absolute inset-0 bg-center bg-cover transition-all duration-500 ease-out
                           group-hover:scale-110 group-hover:grayscale group-hover:brightness-75"
                style={{ backgroundImage: `url(${c.image})` }}
              />

              {/* Overlay for readability */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/15 transition-opacity duration-500 group-hover:opacity-95" />

              {/* Text */}
              <div className="absolute bottom-6 left-6 right-6">
                <h3 className="text-2xl font-bold text-white mb-2">{c.label}</h3>
                <p className="text-gray-300 text-sm transition group-hover:text-white">
                  Explore collection →
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>

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
