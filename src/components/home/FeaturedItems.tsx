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

type FeaturedItemsProps = {
  embedded?: boolean;
};

export function FeaturedItems({ embedded = false }: FeaturedItemsProps) {
  const [featured, setFeatured] = useState<FeaturedProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const formatPrice = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  const checkScrollButtons = useCallback(() => {
    const container = scrollRef.current;
    if (!container) {
      return;
    }

    const maxScrollLeft = container.scrollWidth - container.clientWidth;
    if (maxScrollLeft <= 1) {
      setCanScrollLeft(false);
      setCanScrollRight(false);
      return;
    }

    setCanScrollLeft(container.scrollLeft > 10);
    setCanScrollRight(container.scrollLeft < maxScrollLeft - 10);
  }, []);

  useEffect(() => {
    void loadFeaturedItems();
  }, []);

  useEffect(() => {
    checkScrollButtons();

    const container = scrollRef.current;
    if (!container) {
      return;
    }

    const onScroll = () => checkScrollButtons();
    const onResize = () => checkScrollButtons();
    container.addEventListener("scroll", onScroll, { passive: true });
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
    if (!container) {
      return;
    }

    const scrollAmount = container.clientWidth;
    const target =
      direction === "left"
        ? container.scrollLeft - scrollAmount
        : container.scrollLeft + scrollAmount;

    container.scrollTo({ left: target, behavior: "smooth" });
  };

  if (!isLoading && featured.length === 0) {
    return null;
  }

  const headerShadow = embedded ? "drop-shadow-[0_8px_24px_rgba(17,17,17,0.18)]" : "";

  const Content = (
    <>
      <div
        className={[
          "flex items-center justify-between",
          embedded ? "mb-3 sm:mb-4 md:mb-5" : "mb-6",
        ].join(" ")}
      >
        <h2
          className={[
            "flex items-center gap-2 text-xl font-black uppercase tracking-[0.08em] text-brand-text sm:text-2xl md:text-3xl",
            headerShadow,
          ].join(" ")}
        >
          Featured Items
        </h2>

        <Link
          href="/store"
          className={[
            "whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.12em] text-brand-text transition hover:text-neutral-600 sm:text-xs md:text-sm",
            headerShadow,
          ].join(" ")}
        >
          View All -&gt;
        </Link>
      </div>

      <div className="flex items-stretch gap-2 sm:gap-3">
        <button
          type="button"
          onClick={() => canScrollLeft && scroll("left")}
          disabled={!canScrollLeft}
          aria-label="Scroll left"
          className={[
            "shrink-0 self-center border border-brand-border bg-brand-surface p-1 shadow-lg transition hover:border-brand-text hover:bg-brand-page",
            "sm:p-1.5 md:p-2 lg:p-3",
            !canScrollLeft
              ? "cursor-not-allowed opacity-35 hover:border-brand-border hover:bg-brand-surface"
              : "opacity-100",
          ].join(" ")}
        >
          <ChevronLeft className="h-3 w-3 text-brand-text sm:h-4 sm:w-4 md:h-5 md:w-5 lg:h-6 lg:w-6" />
        </button>

        <div className="flex-1 overflow-hidden">
          <div
            ref={scrollRef}
            className={[
              "flex gap-3 overflow-x-auto scroll-smooth sm:gap-4 md:gap-5",
              embedded ? "pb-0" : "pb-2",
              "snap-x snap-mandatory [&::-webkit-scrollbar]:hidden",
            ].join(" ")}
            style={{
              scrollbarWidth: "none",
              msOverflowStyle: "none",
              WebkitOverflowScrolling: "touch",
              scrollSnapType: "x mandatory",
              scrollPaddingLeft: "0px",
              scrollPaddingRight: "0px",
            }}
          >
            {featured.map((product) => {
              const availableCount =
                product.variants?.filter((variant) => variant.stock > 0).length ?? 0;
              const sizes = product.variants
                ?.filter((variant) => variant.stock > 0)
                .map((variant) => variant.size_label)
                .slice(0, 3);

              return (
                <Link
                  key={product.id}
                  href={`/store/${product.id}`}
                  className="group w-40 flex-shrink-0 snap-start sm:w-48 md:w-52 lg:w-56"
                  style={{ scrollSnapAlign: "start", scrollSnapStop: "always" }}
                >
                  <div className="flex h-full flex-col overflow-hidden border border-brand-border bg-brand-surface transition hover:-translate-y-1 hover:border-brand-text">
                    <div className="relative aspect-square bg-brand-page">
                      {product.primaryImage ? (
                        <Image
                          src={product.primaryImage}
                          alt={product.titleDisplay}
                          fill
                          sizes="(min-width: 1024px) 18vw, (min-width: 640px) 30vw, 45vw"
                          className="object-cover transition-transform duration-300 group-hover:scale-105"
                          quality={75}
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-sm text-brand-muted">
                          No Image
                        </div>
                      )}
                    </div>

                    <div className="flex flex-1 flex-col p-2 sm:p-3">
                      <div className="mb-1 text-[9px] uppercase tracking-[0.2em] text-brand-muted sm:text-[10px]">
                        {product.brand}
                      </div>

                      <h3 className="min-h-[1.75rem] text-[11px] font-bold uppercase leading-tight text-brand-text line-clamp-2 sm:min-h-[2rem] sm:text-xs">
                        {product.titleDisplay}
                      </h3>

                      {sizes && sizes.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1 sm:mt-2">
                          {sizes.map((size, index) => (
                            <span
                              key={index}
                              className="border border-brand-border px-1 py-0.5 text-[9px] text-brand-text sm:px-1.5 sm:text-[10px]"
                            >
                              {size}
                            </span>
                          ))}

                          {availableCount > 3 && (
                            <span className="px-1 py-0.5 text-[9px] text-brand-muted sm:px-1.5 sm:text-[10px]">
                              +{availableCount - 3}
                            </span>
                          )}
                        </div>
                      )}

                      <div className="mt-auto pt-2 sm:pt-3">
                        <span className="whitespace-nowrap text-sm font-extrabold tabular-nums text-brand-text sm:text-base">
                          From {formatPrice(product.minPrice)}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        <button
          type="button"
          onClick={() => canScrollRight && scroll("right")}
          disabled={!canScrollRight}
          aria-label="Scroll right"
          className={[
            "shrink-0 self-center border border-brand-border bg-brand-surface p-1 shadow-lg transition hover:border-brand-text hover:bg-brand-page",
            "sm:p-1.5 md:p-2 lg:p-3",
            !canScrollRight
              ? "cursor-not-allowed opacity-35 hover:border-brand-border hover:bg-brand-surface"
              : "opacity-100",
          ].join(" ")}
        >
          <ChevronRight className="h-3 w-3 text-brand-text sm:h-4 sm:w-4 md:h-5 md:w-5 lg:h-6 lg:w-6" />
        </button>
      </div>
    </>
  );

  if (isLoading) {
    if (embedded) {
      return (
        <div className="flex items-center justify-center py-10">
          <div className="text-brand-text drop-shadow-[0_8px_24px_rgba(17,17,17,0.18)]">
            Loading featured items...
          </div>
        </div>
      );
    }

    return (
      <section className="border-t border-brand-border bg-brand-page py-8 md:py-12">
        <div className="mx-auto max-w-7xl px-4">
          <div className="flex items-center justify-center py-12">
            <div className="text-brand-muted">Loading featured items...</div>
          </div>
        </div>
      </section>
    );
  }

  if (embedded) {
    return <div>{Content}</div>;
  }

  return (
    <section className="border-t border-brand-border bg-brand-page py-8 md:py-12">
      <div className="mx-auto max-w-7xl px-4">{Content}</div>
    </section>
  );
}
