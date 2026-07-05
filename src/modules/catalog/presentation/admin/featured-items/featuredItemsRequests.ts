import type {
  FeaturedItem,
  FeaturedItemsProduct,
} from "@/modules/catalog/presentation/admin/featured-items/featuredItemsTypes";

export async function loadFeaturedItemsRequest() {
  const response = await fetch("/api/admin/featured-items");
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.error || "Failed to load featured items");
  }

  return (data?.items || []) as FeaturedItem[];
}

export async function searchFeaturedItemProductsRequest(
  query: string,
  signal: AbortSignal,
) {
  const params = new URLSearchParams({
    limit: "20",
    includeOutOfStock: "1",
    q: query,
  });

  const response = await fetch(`/api/admin/products?${params.toString()}`, { signal });
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.error || "Failed to search products");
  }

  return (data?.products || []) as FeaturedItemsProduct[];
}

export async function addFeaturedItemRequest(productId: string) {
  const response = await fetch("/api/admin/featured-items", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ productId }),
  });
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.error || "Failed to add featured item");
  }
}

export async function removeFeaturedItemRequest(productId: string) {
  const response = await fetch(`/api/admin/featured-items?productId=${productId}`, {
    method: "DELETE",
  });
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.error || "Failed to remove featured item");
  }
}

export async function reorderFeaturedItemsRequest(items: FeaturedItem[]) {
  const updates = items.map((item, index) => ({
    id: item.id,
    sortOrder: index,
  }));

  const response = await fetch("/api/admin/featured-items/reorder", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ updates }),
  });

  if (!response.ok) {
    throw new Error("Failed to save order");
  }
}
