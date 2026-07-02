"use client";

import { Plus, Search } from "lucide-react";
import Image from "next/image";

import { AdminEmptyState } from "@/components/admin/ui/AdminEmptyState";
import { AdminSectionCard } from "@/components/admin/ui/AdminSectionCard";
import { adminFormStyles } from "@/components/admin/ui/adminFormStyles";
import type { FeaturedItemsProduct } from "@/components/admin/featured-items/featuredItemsTypes";

import { featuredItemsStyles } from "./featuredItemsStyles";

type FeaturedItemsSearchPanelProps = {
  searchQuery: string;
  isSearching: boolean;
  searchResults: FeaturedItemsProduct[];
  onSearchQueryChange: (value: string) => void;
  onAddFeaturedItem: (productId: string) => void;
  formatPrice: (cents: number) => string;
  getMinPrice: (variants?: Array<{ sale_price_cents: number }>) => number;
};

export function FeaturedItemsSearchPanel({
  searchQuery,
  isSearching,
  searchResults,
  onSearchQueryChange,
  onAddFeaturedItem,
  formatPrice,
  getMinPrice,
}: FeaturedItemsSearchPanelProps) {
  const showEmptySearch =
    searchQuery.trim().length > 0 && searchResults.length === 0 && !isSearching;

  return (
    <AdminSectionCard title="Add Products">
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-brand-text">Add Featured Products</h2>
        <p className="mt-1 text-sm text-brand-muted">
          Search the catalog and add products directly into the featured lineup.
        </p>
      </div>

      <div className={featuredItemsStyles.searchPanel}>
        <div className="flex items-center gap-2 border border-brand-border bg-brand-surface px-3 py-2">
          <Search className="h-4 w-4 text-brand-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(event) => onSearchQueryChange(event.target.value)}
            placeholder="Search products by name, brand, or SKU"
            className={`${adminFormStyles.input} border-0 bg-transparent px-0 py-0 placeholder:text-brand-muted focus:border-0`}
          />
          {isSearching ? (
            <div className="text-xs text-brand-muted">Searching...</div>
          ) : null}
        </div>

        {searchResults.length > 0 ? (
          <div className={featuredItemsStyles.searchResults}>
            {searchResults.map((product) => {
              const minPrice = getMinPrice(product.variants);
              const primaryImage = product.images?.[0]?.url;

              return (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => onAddFeaturedItem(product.id)}
                  className={featuredItemsStyles.searchResultItem}
                >
                  {primaryImage ? (
                    <div className={featuredItemsStyles.imageFrame}>
                      <Image
                        src={primaryImage}
                        alt={product.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div className={featuredItemsStyles.imageFallback}>No image</div>
                  )}

                  <div className="min-w-0">
                    <div className="truncate font-semibold text-brand-text">
                      {product.name}
                    </div>
                    <div className="truncate text-sm text-brand-muted">
                      {product.category} | {formatPrice(minPrice)}
                    </div>
                  </div>

                  <Plus className="h-5 w-5 text-brand-text" />
                </button>
              );
            })}
          </div>
        ) : null}
      </div>

      {showEmptySearch ? (
        <div className="mt-4">
          <AdminEmptyState
            title="No Products Found"
            description={`No products matched "${searchQuery}".`}
          />
        </div>
      ) : null}
    </AdminSectionCard>
  );
}
