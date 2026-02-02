// src/components/home/FeaturedItems.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Star } from "lucide-react";
import { logError } from "@/lib/utils/log";

type FeaturedProduct = {
  id: string;
  name: string;
  brand: string;
  model: string | null;
  titleDisplay: string;
  category: string;
  primaryImage: string | null;
  minPrice: number;
  sortOrder: number;
};

export function FeaturedItems() {
  const [featured, setFeatured] = useState<FeaturedProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadFeaturedItems();
  }, []);

  useEffect(() => {
    checkScrollButtons();
    const container = scrollRef.current;
    if (container) {
      container.addEventListener("scroll", checkScrollButtons);
      return () => container.removeEventListener("scroll", checkScrollButtons);
    }
  }, [featured]);

  const loadFeaturedItems = async () => {
    try {
      const response = await fetch("/api/featured-items");
      const data = await response.json();
      if (response.ok) {
        setFeatured(data.featured || []);
      }
    } catch (error) {
      logError(error, { layer: "frontend", event: "load_featured_items_home" });
    } finally {
      setIsLoading(false);
    }
  };

  const checkScrollButtons = () => {
    const container = scrollRef.current;
    if (!container) return;

    setShowLeftArrow(container.scrollLeft > 10);
    setShowRightArrow(
      container.scrollLeft < container.scrollWidth - container.clientWidth - 10
    );
  };

  const scroll = (direction: "left" | "right") => {
    const container = scrollRef.current;
    if (!container) return;

    const scrollAmount = container.clientWidth * 0.8;
    const targetScroll =
      direction === "left"
        ? container.scrollLeft - scrollAmount
        : container.scrollLeft + scrollAmount;

    container.scrollTo({
      left: targetScroll,
      behavior: "smooth",
    });
  };

  const formatPrice = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  // Don't show section if no featured items
  if (!isLoading && featured.length === 0) {
    return null;
  }

  if (isLoading) {
    return (
      <section className="bg-white py-8 md:py-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-center py-12">
            <div className="text-gray-400">Loading featured items...</div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-white py-8 md:py-12 border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl md:text-3xl font-bold text-red-600 flex items-center gap-2">
            <Star className="w-6 h-6 md:w-7 md:h-7" />
            Featured Items
          </h2>
          <Link
            href="/store"
            className="text-sm md:text-base text-gray-600 hover:text-red-600 transition font-medium"
          >
            View All Products →
          </Link>
        </div>

        <div className="relative group">
          {/* Left Arrow */}
          {showLeftArrow && (
            <button
              onClick={() => scroll("left")}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white/95 hover:bg-white shadow-lg rounded-full p-2 md:p-3 transition opacity-0 group-hover:opacity-100"
              aria-label="Scroll left"
            >
              <ChevronLeft className="w-5 h-5 md:w-6 md:h-6 text-gray-800" />
            </button>
          )}

          {/* Right Arrow */}
          {showRightArrow && (
            <button
              onClick={() => scroll("right")}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white/95 hover:bg-white shadow-lg rounded-full p-2 md:p-3 transition opacity-0 group-hover:opacity-100"
              aria-label="Scroll right"
            >
              <ChevronRight className="w-5 h-5 md:w-6 md:h-6 text-gray-800" />
            </button>
          )}

          {/* Scrollable Container */}
          <div
            ref={scrollRef}
            className="flex gap-4 md:gap-6 overflow-x-auto scrollbar-hide scroll-smooth pb-2"
            style={{
              scrollbarWidth: "none",
              msOverflowStyle: "none",
            }}
          >
            {featured.map((product) => (
              <Link
                key={product.id}
                href={`/store/${product.id}`}
                className="flex-shrink-0 w-64 md:w-72 group/card"
              >
                <div className="bg-white border border-gray-200 rounded overflow-hidden hover:shadow-lg transition-all duration-300 hover:border-red-600">
                  {/* Image */}
                  <div className="relative aspect-square bg-gray-100 overflow-hidden">
                    {product.primaryImage ? (
                      <Image
                        src={product.primaryImage}
                        alt={product.titleDisplay}
                        fill
                        className="object-cover group-hover/card:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        No Image
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-4">
                    <div className="text-xs uppercase tracking-wider text-gray-500 mb-1">
                      {product.brand}
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2 min-h-[2.5rem]">
                      {product.titleDisplay}
                    </h3>
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-600 capitalize">
                        {product.category}
                      </div>
                      <div className="text-lg font-bold text-red-600">
                        {formatPrice(product.minPrice)}
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Hide scrollbar globally for this component */}
      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </section>
  );
}