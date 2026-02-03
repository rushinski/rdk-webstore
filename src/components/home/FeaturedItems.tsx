// src/components/home/FeaturedItems.tsx
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { logError } from "@/lib/utils/log";

type FeaturedProduct = {
  id: string;
  name: string;
  brand: string;
  titleDisplay: string;
  category: string;
  primaryImage: string | null;
  minPrice: number;
  sortOrder: number;
  variants?: Array<{
    size_label: string;
    stock: number;
  }>;
};

export function FeaturedItems() {
  const [featured, setFeatured] = useState<FeaturedProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Always render arrows, but disable when you can't scroll.
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  const formatPrice = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  const checkScrollButtons = useCallback(() => {
    const container = scrollRef.current;
    if (!container) return;

    const maxScrollLeft = container.scrollWidth - container.clientWidth;

    // If content doesn't overflow, both should be false.
    if (maxScrollLeft <= 1) {
      setCanScrollLeft(false);
      setCanScrollRight(false);
      return;
    }

    setCanScrollLeft(container.scrollLeft > 10);
    setCanScrollRight(container.scrollLeft < maxScrollLeft - 10);
  }, []);

  useEffect(() => {
    loadFeaturedItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Re-check after data renders
    checkScrollButtons();

    const container = scrollRef.current;
    if (!container) return;

    const onScroll = () => checkScrollButtons();
    container.addEventListener("scroll", onScroll, { passive: true });

    const onResize = () => checkScrollButtons();
    window.addEventListener("resize", onResize);

    return () => {
      container.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
    };
  }, [featured, checkScrollButtons]);

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

  const scroll = (direction: "left" | "right") => {
    const container = scrollRef.current;
    if (!container) return;

    const scrollAmount = Math.max(240, Math.floor(container.clientWidth * 0.85));
    const target =
      direction === "left"
        ? container.scrollLeft - scrollAmount
        : container.scrollLeft + scrollAmount;

    container.scrollTo({ left: target, behavior: "smooth" });
  };

  // Don't show section if no featured items
  if (!isLoading && featured.length === 0) return null;

  if (isLoading) {
    return (
      <section className="bg-black py-8 md:py-12 border-t border-zinc-900">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-center py-12">
            <div className="text-gray-400">Loading featured items...</div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-black py-8 md:py-12 border-t border-zinc-900">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl md:text-3xl font-bold text-white-500 flex items-center gap-2">
            Featured Items
          </h2>

          <Link
            href="/store"
            className="text-sm md:text-base text-gray-300 hover:text-white transition font-medium"
          >
            View All Products →
          </Link>
        </div>

        {/* Arrows OUTSIDE the scroll area + ALWAYS visible */}
        <div className="flex items-stretch gap-3">
          {/* Left Arrow */}
          <button
            type="button"
            onClick={() => canScrollLeft && scroll("left")}
            disabled={!canScrollLeft}
            aria-label="Scroll left"
            className={[
              "shrink-0 self-center rounded-full p-2 md:p-3 shadow-lg transition",
              "bg-zinc-900 border border-zinc-800",
              "hover:bg-zinc-800",
              !canScrollLeft ? "opacity-35 cursor-not-allowed hover:bg-zinc-900" : "opacity-100",
            ].join(" ")}
          >
            <ChevronLeft className="w-5 h-5 md:w-6 md:h-6 text-white" />
          </button>

          {/* Scrollable Container */}
          <div
            ref={scrollRef}
            className="flex-1 flex gap-4 md:gap-5 overflow-x-auto scroll-smooth pb-2"
            style={{ 
              scrollbarWidth: "none", 
              msOverflowStyle: "none",
              WebkitOverflowScrolling: "touch"
            }}
          >
            {featured.map((product) => {
              // Get available sizes from variants
              const sizes = product.variants
                ?.filter((v) => v.stock > 0)
                .map((v) => v.size_label)
                .slice(0, 3); // Show max 3 sizes

              return (
                <Link
                  key={product.id}
                  href={`/store/${product.id}`}
                  className="flex-shrink-0 w-48 sm:w-52 md:w-56 group"
                >
                  {/* Match ProductCard vibe */}
                  <div className="bg-zinc-900 border border-zinc-800/70 rounded overflow-hidden hover:border-zinc-600/70 transition flex h-full flex-col">
                    {/* Image */}
                    <div className="aspect-square relative bg-zinc-800">
                      {product.primaryImage ? (
                        <Image
                          src={product.primaryImage}
                          alt={product.titleDisplay}
                          fill
                          sizes="(min-width: 1024px) 18vw, (min-width: 640px) 30vw, 45vw"
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                          quality={75}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
                          No Image
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="p-3 flex flex-col flex-1">
                      {/* Brand */}
                      <div className="text-[10px] uppercase tracking-[0.2em] text-gray-400 mb-1">
                        {product.brand}
                      </div>

                      {/* Title - smaller font */}
                      <h3 className="text-white font-bold text-xs line-clamp-2 min-h-[2rem] leading-tight">
                        {product.titleDisplay}
                      </h3>

                      {/* Sizes */}
                      {sizes && sizes.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {sizes.map((size, idx) => (
                            <span
                              key={idx}
                              className="text-[10px] px-1.5 py-0.5 bg-zinc-800 text-gray-300 rounded"
                            >
                              {size}
                            </span>
                          ))}
                          {(product.variants?.filter((v) => v.stock > 0).length ?? 0) > 3 && (
                            <span className="text-[10px] px-1.5 py-0.5 text-gray-400">
                              +{(product.variants?.filter((v) => v.stock > 0).length ?? 0) - 3}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Price bottom (ProductCard style) */}
                      <div className="mt-auto pt-3">
                        <span className="text-white font-extrabold text-base whitespace-nowrap tabular-nums">
                          From {formatPrice(product.minPrice)}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Right Arrow */}
          <button
            type="button"
            onClick={() => canScrollRight && scroll("right")}
            disabled={!canScrollRight}
            aria-label="Scroll right"
            className={[
              "shrink-0 self-center rounded-full p-2 md:p-3 shadow-lg transition",
              "bg-zinc-900 border border-zinc-800",
              "hover:bg-zinc-800",
              !canScrollRight ? "opacity-35 cursor-not-allowed hover:bg-zinc-900" : "opacity-100",
            ].join(" ")}
          >
            <ChevronRight className="w-5 h-5 md:w-6 md:h-6 text-white" />
          </button>
        </div>
      </div>
    </section>
  );
}