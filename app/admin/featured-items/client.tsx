// app/admin/featured-items/client.tsx
"use client";

import { useState, useEffect } from "react";
import { Star, GripVertical, X, Plus, Search } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { logError } from "@/lib/utils/log";
import { Toast } from "@/components/ui/Toast";

type FeaturedItem = {
  id: string;
  product_id: string;
  sort_order: number;
  product: {
    id: string;
    name: string;
    brand: string;
    model: string | null;
    title_display: string;
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
      price_cents: number;
      stock: number;
    }>;
  };
};

type Product = {
  id: string;
  name: string;
  brand: string;
  title_display: string;
  category: string;
  images: Array<{ url: string }>;
  variants: Array<{ price_cents: number }>;
};

export function FeaturedItemsManager() {
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
    loadFeaturedItems();
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

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
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

  const getMinPrice = (variants?: Array<{ price_cents: number }>) => {
    if (!variants || variants.length === 0) {
      return 0;
    }
    return Math.min(...variants.map((v) => v.price_cents));
  };

  const featuredProductIds = new Set(featuredItems.map((item) => item.product_id));
  const filteredSearchResults = searchResults.filter(
    (product) => !featuredProductIds.has(product.id),
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-400">Loading featured items...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Add Products Section */}
      <div className="bg-zinc-900 border border-zinc-800/70 rounded p-6">
        <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Add Products
        </h2>

        <div className="relative">
          <div className="flex items-center gap-2 bg-zinc-800 border border-zinc-800/70 rounded px-4 py-2">
            <Search className="w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products by name, brand, or SKU..."
              className="flex-1 bg-transparent text-white focus:outline-none"
            />
            {isSearching && <div className="text-xs text-gray-400">Searching...</div>}
          </div>

          {filteredSearchResults.length > 0 && (
            <div className="absolute z-10 w-full mt-2 bg-zinc-800 border border-zinc-700 rounded shadow-lg max-h-96 overflow-y-auto">
              {filteredSearchResults.map((product) => {
                const minPrice = getMinPrice(product.variants);
                const primaryImage = product.images?.[0]?.url;

                return (
                  <button
                    key={product.id}
                    onClick={() => void addFeaturedItem(product.id)}
                    className="w-full flex items-center gap-4 p-4 hover:bg-zinc-700 transition text-left"
                  >
                    {primaryImage ? (
                      <div className="relative w-16 h-16 bg-zinc-900 rounded overflow-hidden flex-shrink-0">
                        <Image
                          src={primaryImage}
                          alt={product.title_display}
                          fill
                          className="object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-16 h-16 bg-zinc-900 rounded flex items-center justify-center flex-shrink-0">
                        <span className="text-gray-500 text-xs">No image</span>
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="text-white font-semibold truncate">
                        {product.title_display}
                      </div>
                      <div className="text-sm text-gray-400 truncate">
                        {product.category} • {formatPrice(minPrice)}
                      </div>
                    </div>

                    <Plus className="w-5 h-5 text-red-500 flex-shrink-0" />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {searchQuery.trim().length > 0 &&
          filteredSearchResults.length === 0 &&
          !isSearching && (
            <div className="mt-4 text-center text-gray-400 text-sm">
              No products found matching "{searchQuery}"
            </div>
          )}
      </div>

      {/* Featured Items List */}
      <div className="bg-zinc-900 border border-zinc-800/70 rounded p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-500" />
            Featured Items ({featuredItems.length})
          </h2>
          <Link
            href="/"
            target="_blank"
            className="text-sm text-gray-400 hover:text-white transition"
          >
            View on home page →
          </Link>
        </div>

        {featuredItems.length === 0 ? (
          <div className="text-center py-12">
            <Star className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 text-lg mb-2">No featured items yet</p>
            <p className="text-gray-500 text-sm">
              Search for products above to add them to the featured section
            </p>
          </div>
        ) : (
          <>
            <div className="mb-4 text-sm text-gray-400">
              Drag items to reorder. Items appear left-to-right on the home page.
            </div>

            <div className="space-y-3">
              {featuredItems.map((item, index) => {
                const primaryImage =
                  item.product.images?.find((img) => img.is_primary)?.url ||
                  item.product.images?.[0]?.url;
                const minPrice = getMinPrice(item.product.variants);

                return (
                  <div
                    key={item.id}
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragEnd={() => void handleDragEnd()}
                    className={[
                      "flex items-center gap-4 p-4 bg-zinc-800 border border-zinc-800/70 rounded",
                      "hover:border-zinc-700 transition cursor-move",
                      draggedIndex === index ? "opacity-50" : "",
                    ].join(" ")}
                  >
                    <GripVertical className="w-5 h-5 text-gray-500 flex-shrink-0" />

                    <div className="w-8 h-8 bg-zinc-700 rounded flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-semibold text-gray-300">
                        {index + 1}
                      </span>
                    </div>

                    {primaryImage ? (
                      <div className="relative w-16 h-16 bg-zinc-900 rounded overflow-hidden flex-shrink-0">
                        <Image
                          src={primaryImage}
                          alt={item.product.title_display}
                          fill
                          className="object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-16 h-16 bg-zinc-900 rounded flex items-center justify-center flex-shrink-0">
                        <span className="text-gray-500 text-xs">No image</span>
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="text-white font-semibold truncate">
                        {item.product.title_display}
                      </div>
                      <div className="text-sm text-gray-400 truncate">
                        {item.product.category} • {formatPrice(minPrice)}
                      </div>
                      {item.product.is_out_of_stock && (
                        <div className="text-xs text-red-400 mt-1">
                          Out of stock (hidden on home page)
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => void removeFeaturedItem(item.product_id)}
                      className="p-2 hover:bg-zinc-700 rounded transition flex-shrink-0"
                      title="Remove from featured"
                    >
                      <X className="w-5 h-5 text-red-500" />
                    </button>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      <Toast
        open={Boolean(toast)}
        message={toast?.message ?? ""}
        tone={toast?.tone ?? "info"}
        onClose={() => setToast(null)}
      />
    </div>
  );
}
