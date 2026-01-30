// src/components/store/InfiniteProductGrid.tsx
// FIXED VERSION - Properly resets on filter changes, scrolls to top
"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { ProductWithDetails } from "@/types/domain/product";
import { ProductCard } from "./ProductCard";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";

interface InfiniteProductGridProps {
  initialProducts: ProductWithDetails[];
  total: number;
  initialPage: number;
  limit: number;
  storeHref?: string;
}

const PRIORITY_CARDS_COUNT = 8;

export function InfiniteProductGrid({
  initialProducts,
  total,
  initialPage,
  limit,
  storeHref,
}: InfiniteProductGridProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  
  // FIXED: Reset products when initialProducts change (filter change)
  const [products, setProducts] = useState<ProductWithDetails[]>(initialProducts);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const prevSearchParamsRef = useRef(searchParams.toString());

  // FIXED: Detect when filters change and reset everything
  useEffect(() => {
    const currentSearchString = searchParams.toString();
    
    // Check if search params changed (filter change)
    if (currentSearchString !== prevSearchParamsRef.current) {
      // Reset to initial state
      setProducts(initialProducts);
      setCurrentPage(initialPage);
      prevSearchParamsRef.current = currentSearchString;
      
      // FIXED: Scroll to top when filters change
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [searchParams, initialProducts, initialPage]);

  // Calculate if there are more products to load
  const hasMore = products.length < total;

  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;

    setIsLoadingMore(true);
    const nextPage = currentPage + 1;

    try {
      // Build query string with next page
      const params = new URLSearchParams(searchParams.toString());
      params.set("page", String(nextPage));
      params.set("limit", String(limit));

      // Fetch next page of products
      const response = await fetch(`/api/store/products?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error("Failed to fetch products");
      }

      const data = await response.json();
      
      if (data.products && data.products.length > 0) {
        setProducts((prev) => [...prev, ...data.products]);
        setCurrentPage(nextPage);
      }
    } catch (error) {
      console.error("Failed to load more products:", error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [currentPage, hasMore, isLoadingMore, limit, searchParams]);

  // Set up infinite scroll observer
  const sentinelRef = useInfiniteScroll({
    onLoadMore: loadMore,
    hasMore,
    isLoading: isLoadingMore,
    threshold: 500,
  });

  if (products.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">No products found</p>
      </div>
    );
  }

  return (
    <>
      <div
        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4"
        data-testid="product-grid"
      >
        {products.map((product, index) => (
          <ProductCard
            key={`${product.id}-${index}`}
            product={product}
            storeHref={storeHref}
            priority={index < PRIORITY_CARDS_COUNT}
          />
        ))}
      </div>

      {/* Sentinel element for infinite scroll */}
      {hasMore && (
        <div
          ref={sentinelRef}
          className="flex items-center justify-center py-8"
        >
          {isLoadingMore && (
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-gray-400">Loading more products...</p>
            </div>
          )}
        </div>
      )}

      {/* Show end message when all products are loaded */}
      {!hasMore && products.length > 0 && (
        <div className="text-center py-8">
          <p className="text-sm text-gray-500">
            You've reached the end - {products.length} of {total} products
          </p>
        </div>
      )}
    </>
  );
}