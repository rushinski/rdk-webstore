"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Search, X } from "lucide-react";
import { useRouter } from "next/navigation";

import { logError } from "@/lib/utils/log";

type SearchResult = {
  id: string;
  name?: string | null;
  brand?: string | null;
  images?: Array<{ url?: string | null }> | null;
  variants?: Array<{
    sale_price_cents?: number | null;
    compare_at_price_cents?: number | null;
  }> | null;
};

export function StorefrontSearchOverlay({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !query.trim()) {
      setResults([]);
      return;
    }

    const runSearch = async () => {
      setIsLoading(true);

      try {
        const response = await fetch(
          `/api/store/products?q=${encodeURIComponent(query)}&limit=6`,
        );
        const data = await response.json();
        setResults(Array.isArray(data.products) ? data.products : []);
      } catch (error) {
        logError(error, { layer: "frontend", event: "storefront_search_overlay_error" });
      } finally {
        setIsLoading(false);
      }
    };

    const timeoutId = window.setTimeout(() => {
      void runSearch();
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [isOpen, query]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[60] bg-black/40">
      <button
        type="button"
        className="absolute inset-0"
        aria-label="Close search"
        onClick={onClose}
      />
      <div className="fixed inset-x-0 top-0 bg-brand-surface">
        <div className="mx-auto max-w-brand border-b border-brand-border px-6 py-4 md:px-12 lg:px-16">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (!query.trim()) {
                return;
              }
              router.push(`/store?q=${encodeURIComponent(query)}`);
              onClose();
            }}
            className="grid grid-cols-[auto_1fr_auto] items-center gap-4"
          >
            <Search className="h-5 w-5 text-brand-muted" />
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="SEARCH FOR..."
              className="bg-transparent text-lg text-brand-text outline-none placeholder:text-brand-muted"
            />
            <button
              type="button"
              onClick={onClose}
              className="text-brand-muted hover:text-brand-text"
            >
              <X className="h-5 w-5" />
            </button>
          </form>
        </div>

        <div className="mx-auto max-h-[60vh] max-w-brand overflow-y-auto border-t border-brand-border bg-brand-surface px-6 py-6 md:px-12 lg:px-16">
          {isLoading ? <p className="text-sm text-brand-muted">Searching...</p> : null}

          {!isLoading && query && results.length === 0 ? (
            <p className="text-sm text-brand-muted">
              Sorry, nothing found for &quot;{query}&quot;.
            </p>
          ) : null}

          {results.length > 0 ? (
            <div className="grid gap-8 md:grid-cols-[1fr_240px]">
              <div>
                <div className="mb-4 text-xs font-bold uppercase tracking-[0.12em] text-brand-muted">
                  Product Matches
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  {results.map((product) => {
                    const currentPrice = Number(
                      product.variants?.[0]?.sale_price_cents ?? 0,
                    );
                    const compareAt = Number(
                      product.variants?.[0]?.compare_at_price_cents ?? 0,
                    );

                    return (
                      <button
                        key={product.id}
                        type="button"
                        onClick={() => {
                          router.push(`/store/${product.id}`);
                          onClose();
                        }}
                        className="grid grid-cols-[4rem_1fr] gap-3 text-left"
                      >
                        <div className="relative h-16 w-16 bg-brand-page">
                          <Image
                            src={product.images?.[0]?.url || "/placeholder.png"}
                            alt={product.name || "Product image"}
                            fill
                            sizes="64px"
                            className="object-contain"
                          />
                        </div>
                        <div>
                          <div className="text-xs font-medium uppercase tracking-[0.06em] text-brand-muted">
                            {product.brand || "Brand"}
                          </div>
                          <div className="text-sm uppercase text-brand-text">
                            {product.name}
                          </div>
                          <div className="mt-1 text-sm font-medium text-brand-text">
                            $
                            {Number.isFinite(currentPrice)
                              ? (currentPrice / 100).toFixed(2)
                              : "0.00"}
                            {compareAt > currentPrice ? (
                              <span className="ml-2 text-brand-muted line-through">
                                ${(compareAt / 100).toFixed(2)}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="border-l border-brand-border pl-6">
                <div className="mb-4 text-xs font-bold uppercase tracking-[0.12em] text-brand-muted">
                  Search Suggestions
                </div>
                <div className="space-y-2">
                  {["Sneakers", "Clothing", "Accessories", "Nike", "Air Jordan"].map(
                    (item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => setQuery(item)}
                        className="block text-sm text-brand-text hover:underline"
                      >
                        {item}
                      </button>
                    ),
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
