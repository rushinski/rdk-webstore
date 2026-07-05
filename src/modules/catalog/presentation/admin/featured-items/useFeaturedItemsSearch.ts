"use client";

import { useEffect, useMemo, useState } from "react";

import { logError } from "@/lib/utils/log";
import { searchFeaturedItemProductsRequest } from "@/modules/catalog/presentation/admin/featured-items/featuredItemsRequests";
import type {
  FeaturedItem,
  FeaturedItemsProduct,
  FeaturedItemsToastState,
} from "@/modules/catalog/presentation/admin/featured-items/featuredItemsTypes";

type UseFeaturedItemsSearchArgs = {
  featuredItems: FeaturedItem[];
  setToast: (toast: FeaturedItemsToastState) => void;
};

export function useFeaturedItemsSearch({
  featuredItems,
  setToast,
}: UseFeaturedItemsSearchArgs) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<FeaturedItemsProduct[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    const query = searchQuery.trim();
    if (query.length === 0) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    const controller = new AbortController();

    const searchProducts = async () => {
      setIsSearching(true);
      try {
        setSearchResults(await searchFeaturedItemProductsRequest(query, controller.signal));
      } catch (error: unknown) {
        const isAbort =
          error instanceof DOMException
            ? error.name === "AbortError"
            : typeof error === "object" &&
              error !== null &&
              "name" in error &&
              (error as { name?: string }).name === "AbortError";

        if (!isAbort) {
          setSearchResults([]);
          logError(error, { layer: "frontend", event: "featured_items_search" });
          setToast({
            message: error instanceof Error ? error.message : "Failed to search products",
            tone: "error",
          });
        }
      } finally {
        setIsSearching(false);
      }
    };

    const timeout = setTimeout(() => {
      void searchProducts();
    }, 150);

    return () => {
      controller.abort();
      clearTimeout(timeout);
    };
  }, [searchQuery, setToast]);

  const filteredSearchResults = useMemo(() => {
    const featuredProductIds = new Set(featuredItems.map((item) => item.product_id));
    return searchResults.filter((product) => !featuredProductIds.has(product.id));
  }, [featuredItems, searchResults]);

  const resetSearch = () => {
    setSearchQuery("");
    setSearchResults([]);
  };

  return {
    filteredSearchResults,
    isSearching,
    resetSearch,
    searchQuery,
    setSearchQuery,
  };
}
