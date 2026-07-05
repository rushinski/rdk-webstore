"use client";

import { AdminEmptyState } from "@/components/admin/ui/AdminEmptyState";
import { AdminPageHeader } from "@/components/admin/ui/AdminPageHeader";
import { FeaturedItemsFeedback } from "@/modules/catalog/presentation/admin/featured-items/FeaturedItemsFeedback";
import { FeaturedItemsList } from "@/modules/catalog/presentation/admin/featured-items/FeaturedItemsList";
import { FeaturedItemsSearchPanel } from "@/modules/catalog/presentation/admin/featured-items/FeaturedItemsSearchPanel";
import { useFeaturedItemsScreen } from "@/modules/catalog/presentation/admin/featured-items/useFeaturedItemsScreen";
import {
  formatFeaturedItemPrice,
  getFeaturedItemMinPrice,
} from "@/modules/catalog/presentation/admin/featured-items/featuredItemsView";

export function FeaturedItemsScreen() {
  const {
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
  } = useFeaturedItemsScreen();

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
        formatPrice={formatFeaturedItemPrice}
        getMinPrice={getFeaturedItemMinPrice}
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
        formatPrice={formatFeaturedItemPrice}
        getMinPrice={getFeaturedItemMinPrice}
      />

      <FeaturedItemsFeedback toast={toast} onCloseToast={() => setToast(null)} />
    </div>
  );
}
