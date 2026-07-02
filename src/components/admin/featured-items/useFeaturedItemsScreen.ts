"use client";

import { useEffect, useState } from "react";

import {
  addFeaturedItemRequest,
  loadFeaturedItemsRequest,
  removeFeaturedItemRequest,
  reorderFeaturedItemsRequest,
} from "@/components/admin/featured-items/featuredItemsRequests";
import type {
  FeaturedItem,
  FeaturedItemsToastState,
} from "@/components/admin/featured-items/featuredItemsTypes";
import { useFeaturedItemsSearch } from "@/components/admin/featured-items/useFeaturedItemsSearch";
import { logError } from "@/lib/utils/log";

export function useFeaturedItemsScreen() {
  const [featuredItems, setFeaturedItems] = useState<FeaturedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [toast, setToast] = useState<FeaturedItemsToastState>(null);
  const {
    filteredSearchResults,
    isSearching,
    resetSearch,
    searchQuery,
    setSearchQuery,
  } = useFeaturedItemsSearch({
    featuredItems,
    setToast,
  });

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

  const addFeaturedItem = async (productId: string) => {
    try {
      await addFeaturedItemRequest(productId);
      setToast({ message: "Product added to featured items", tone: "success" });
      resetSearch();
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
