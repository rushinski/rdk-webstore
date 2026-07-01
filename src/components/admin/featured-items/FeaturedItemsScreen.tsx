"use client";

import { useEffect, useState } from "react";

import { AdminEmptyState } from "@/components/admin/ui/AdminEmptyState";
import { AdminPageHeader } from "@/components/admin/ui/AdminPageHeader";
import { Toast } from "@/components/ui/Toast";
import { logError } from "@/lib/utils/log";

import { FeaturedItemsList } from "./FeaturedItemsList";
import { FeaturedItemsSearchPanel } from "./FeaturedItemsSearchPanel";

type FeaturedItem = {
  id: string;
  product_id: string;
  sort_order: number;
  product: {
    id: string;
    name: string;
    brand: string;
    model: string | null;
    category: string;
    is_active: boolean;
    is_out_of_stock: boolean;
    images?: Array<{
      url: string;
      is_primary: boolean;
      sort_order: number;
    }>;
    variants?: Array<{
      id: string;
      sale_price_cents: number;
      stock: number;
    }>;
  };
};

type Product = {
  id: string;
  name: string;
  brand: string;
  category: string;
  images: Array<{ url: string }>;
  variants: Array<{ sale_price_cents: number }>;
};

export function FeaturedItemsScreen() {
  const [featuredItems, setFeaturedItems] = useState<FeaturedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [toast, setToast] = useState<{
    message: string;
    tone: "success" | "error" | "info";
  } | null>(null);

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
        const params = new URLSearchParams({
          limit: "20",
          includeOutOfStock: "1",
        });
        params.set("q", query);

        const response = await fetch(`/api/admin/products?${params.toString()}`, {
          signal: controller.signal,
        });
        const data = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(data?.error || "Failed to search products");
        }
        setSearchResults(data?.products || []);
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

  const loadFeaturedItems = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/admin/featured-items");
      const data = await response.json();
      if (response.ok) {
        setFeaturedItems(data.items || []);
      } else {
        throw new Error(data.error || "Failed to load featured items");
      }
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

  const addFeaturedItem = async (productId: string) => {
    try {
      const response = await fetch("/api/admin/featured-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to add featured item");
      }

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
      const response = await fetch(`/api/admin/featured-items?productId=${productId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to remove featured item");
      }

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

    const updates = featuredItems.map((item, index) => ({
      id: item.id,
      sortOrder: index,
    }));

    try {
      const response = await fetch("/api/admin/featured-items/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates }),
      });

      if (!response.ok) {
        throw new Error("Failed to save order");
      }

      setToast({ message: "Order updated successfully", tone: "success" });
    } catch (error) {
      logError(error, { layer: "frontend", event: "reorder_featured_items" });
      setToast({ message: "Failed to save order", tone: "error" });
      await loadFeaturedItems();
    } finally {
      setDraggedIndex(null);
    }
  };

  const formatPrice = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  const getMinPrice = (variants?: Array<{ sale_price_cents: number }>) => {
    if (!variants || variants.length === 0) {
      return 0;
    }
    return Math.min(...variants.map((variant) => variant.sale_price_cents));
  };

  const featuredProductIds = new Set(featuredItems.map((item) => item.product_id));
  const filteredSearchResults = searchResults.filter(
    (product) => !featuredProductIds.has(product.id),
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <AdminPageHeader
          title="Featured Items"
          description="Manage the featured product lineup shown on the storefront home page."
        />
        <AdminEmptyState
          title="Loading Featured Items"
          description="Pulling the current featured lineup now."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Featured Items"
        description="Manage the featured product lineup shown on the storefront home page."
      />

      <FeaturedItemsSearchPanel
        searchQuery={searchQuery}
        isSearching={isSearching}
        searchResults={filteredSearchResults}
        onSearchQueryChange={setSearchQuery}
        onAddFeaturedItem={(productId) => {
          void addFeaturedItem(productId);
        }}
        formatPrice={formatPrice}
        getMinPrice={getMinPrice}
      />

      <FeaturedItemsList
        featuredItems={featuredItems}
        draggedIndex={draggedIndex}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={() => {
          void handleDragEnd();
        }}
        onRemoveFeaturedItem={(productId) => {
          void removeFeaturedItem(productId);
        }}
        formatPrice={formatPrice}
        getMinPrice={getMinPrice}
      />

      <Toast
        open={Boolean(toast)}
        message={toast?.message ?? ""}
        tone={toast?.tone ?? "info"}
        onClose={() => setToast(null)}
      />
    </div>
  );
}
