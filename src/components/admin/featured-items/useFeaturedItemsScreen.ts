"use client";

import { useEffect, useMemo, useState } from "react";

import {
  addFeaturedItemRequest,
  loadFeaturedItemsRequest,
  removeFeaturedItemRequest,
  reorderFeaturedItemsRequest,
  searchFeaturedItemProductsRequest,
} from "@/components/admin/featured-items/featuredItemsRequests";
import type {
  FeaturedItem,
  FeaturedItemsProduct,
  FeaturedItemsToastState,
} from "@/components/admin/featured-items/featuredItemsTypes";
import { logError } from "@/lib/utils/log";

export function useFeaturedItemsScreen() {
  const [featuredItems, setFeaturedItems] = useState<FeaturedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<FeaturedItemsProduct[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [toast, setToast] = useState<FeaturedItemsToastState>(null);

  const loadFeaturedItems = async () => {
    setIsLoading(true);
    try {
      setFeaturedItems(await loadFeaturedItemsRequest());
    } catch (error) {
      logError(error, { layer: "frontend", event: "load_featured_items" });
      setToast({
        message: error instanceof Error ? error.message : "Failed to load featured items",
        tone: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadFeaturedItems();
  }, []);

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
  }, [searchQuery]);

  const addFeaturedItem = async (productId: string) => {
    try {
      await addFeaturedItemRequest(productId);
      setToast({ message: "Product added to featured items", tone: "success" });
      setSearchQuery("");
      setSearchResults([]);
      await loadFeaturedItems();
    } catch (error) {
      logError(error, { layer: "frontend", event: "add_featured_item" });
      setToast({
        message: error instanceof Error ? error.message : "Failed to add featured item",
        tone: "error",
      });
    }
  };

  const removeFeaturedItem = async (productId: string) => {
    try {
      await removeFeaturedItemRequest(productId);
      setToast({ message: "Product removed from featured items", tone: "success" });
      await loadFeaturedItems();
    } catch (error) {
      logError(error, { layer: "frontend", event: "remove_featured_item" });
      setToast({
        message:
          error instanceof Error ? error.message : "Failed to remove featured item",
        tone: "error",
      });
    }
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (event: React.DragEvent, index: number) => {
    event.preventDefault();
    if (draggedIndex === null || draggedIndex === index) {
      return;
    }

    const newItems = [...featuredItems];
    const draggedItem = newItems[draggedIndex];
    newItems.splice(draggedIndex, 1);
    newItems.splice(index, 0, draggedItem);

    setFeaturedItems(newItems);
    setDraggedIndex(index);
  };

  const handleDragEnd = async () => {
    if (draggedIndex === null) {
      return;
    }

    try {
      await reorderFeaturedItemsRequest(featuredItems);
      setToast({ message: "Order updated successfully", tone: "success" });
    } catch (error) {
      logError(error, { layer: "frontend", event: "reorder_featured_items" });
      setToast({ message: "Failed to save order", tone: "error" });
      await loadFeaturedItems();
    } finally {
      setDraggedIndex(null);
    }
  };

  const filteredSearchResults = useMemo(() => {
    const featuredProductIds = new Set(featuredItems.map((item) => item.product_id));
    return searchResults.filter((product) => !featuredProductIds.has(product.id));
  }, [featuredItems, searchResults]);

  return {
    addFeaturedItem,
    draggedIndex,
    featuredItems,
    filteredSearchResults,
    handleDragEnd,
    handleDragOver,
    handleDragStart,
    isLoading,
    isSearching,
    removeFeaturedItem,
    searchQuery,
    setSearchQuery,
    setToast,
    toast,
  };
}
