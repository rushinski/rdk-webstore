"use client";

import { GripVertical, Star, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { AdminEmptyState } from "@/components/admin/ui/AdminEmptyState";
import { AdminSectionCard } from "@/components/admin/ui/AdminSectionCard";
import { adminButtonStyles } from "@/components/admin/ui/adminButtonStyles";
import type { FeaturedItem } from "@/components/admin/featured-items/featuredItemsTypes";

import { featuredItemsStyles } from "./featuredItemsStyles";

type FeaturedItemsListProps = {
  featuredItems: FeaturedItem[];
  draggedIndex: number | null;
  onDragStart: (index: number) => void;
  onDragOver: (event: React.DragEvent, index: number) => void;
  onDragEnd: () => void;
  onRemoveFeaturedItem: (productId: string) => void;
  formatPrice: (cents: number) => string;
  getMinPrice: (variants?: Array<{ sale_price_cents: number }>) => number;
};

export function FeaturedItemsList({
  featuredItems,
  draggedIndex,
  onDragStart,
  onDragOver,
  onDragEnd,
  onRemoveFeaturedItem,
  formatPrice,
  getMinPrice,
}: FeaturedItemsListProps) {
  return (
    <AdminSectionCard title="Featured Lineup">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-semibold text-brand-text">
            <Star className="h-5 w-5 text-amber-700" />
            Featured Items ({featuredItems.length})
          </h2>
          <p className="mt-1 text-sm text-brand-muted">
            Drag items to reorder the home-page merchandising sequence.
          </p>
        </div>
        <Link href="/" target="_blank" className={adminButtonStyles.secondary}>
          View Home Page
        </Link>
      </div>

      {featuredItems.length === 0 ? (
        <AdminEmptyState
          title="No Featured Items Yet"
          description="Search for products above to add them to the featured section."
        />
      ) : (
        <div className="space-y-3">
          {featuredItems.map((item, index) => {
            const primaryImage =
              item.product.images?.find((image) => image.is_primary)?.url ||
              item.product.images?.[0]?.url;
            const minPrice = getMinPrice(item.product.variants);

            return (
              <div
                key={item.id}
                draggable
                onDragStart={() => onDragStart(index)}
                onDragOver={(event) => onDragOver(event, index)}
                onDragEnd={onDragEnd}
                className={`${featuredItemsStyles.listRow} ${
                  draggedIndex === index ? featuredItemsStyles.draggedRow : ""
                }`}
              >
                <GripVertical className="h-5 w-5 flex-shrink-0 text-brand-muted" />

                <div className={featuredItemsStyles.positionBadge}>{index + 1}</div>

                {primaryImage ? (
                  <div className={featuredItemsStyles.imageFrame}>
                    <Image
                      src={primaryImage}
                      alt={item.product.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className={featuredItemsStyles.imageFallback}>No image</div>
                )}

                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold text-brand-text">
                    {item.product.name}
                  </div>
                  <div className="truncate text-sm text-brand-muted">
                    {item.product.category} | {formatPrice(minPrice)}
                  </div>
                  {item.product.is_out_of_stock ? (
                    <div className="mt-1 text-xs text-red-700">
                      Out of stock (hidden on home page)
                    </div>
                  ) : null}
                </div>

                <button
                  type="button"
                  onClick={() => onRemoveFeaturedItem(item.product_id)}
                  className="p-2 text-red-700 transition hover:bg-red-50"
                  title="Remove from featured"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </AdminSectionCard>
  );
}
