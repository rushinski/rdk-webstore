// app/page.tsx
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

const categories = [
  {
    slug: 'sneakers',
    label: 'Sneakers',
    image: '/images/home/sneakers.png',
  },
  {
    slug: 'clothing',
    label: 'Clothing',
    image: '/images/home/clothing.png',
  },
  {
    slug: 'accessories',
    label: 'Accessories',
    image: '/images/home/accessories.png',
  },
  {
    slug: 'electronics',
    label: 'Electronics',
    image: '/images/home/electronics.png',
  },
];

export default function HomePage() {
  return (
    <div className="relative">
      {/* Hero Section */}
      <div className="relative h-[80vh] flex items-center justify-center bg-gradient-to-br from-black via-zinc-900 to-black">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute inset-0 bg-[url('/noise.png')] opacity-50" />
        </div>
        <div className="relative text-center px-4">
          <h1 className="text-6xl md:text-8xl font-bold text-white mb-6 tracking-tight">
            REAL DEAL KICKZ
          </h1>
          <p className="text-xl md:text-2xl text-gray-400 mb-8 max-w-2xl mx-auto">
            Authentic sneakers and streetwear. Every pair verified. Every style bold.
          </p>
          <Link
            href="/store"
            className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold px-8 py-4 rounded transition"
          >
            Shop Now
            <ArrowRight className="w-5 h-5" />
          </Link>
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
              className="group relative overflow-hidden rounded bg-zinc-900 h-44 sm:h-56 lg:h-64 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
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

      {/* CTA Section */}
      <div className="bg-gradient-to-r from-red-900/20 to-red-600/20 py-20">
        <div className="max-w-4xl mx-auto text-center px-4">
          <h2 className="text-4xl font-bold text-white mb-6">New drops every week</h2>
          <p className="text-xl text-gray-400 mb-8">
            Stay ahead of the game. Sign up for exclusive access to limited releases.
          </p>
          <Link
            href="/auth/register"
            className="inline-block bg-white text-black font-bold px-8 py-4 rounded hover:bg-gray-200 transition"
          >
            Create Account
          </Link>
        </div>
      </div>
    </div>
  );
}
