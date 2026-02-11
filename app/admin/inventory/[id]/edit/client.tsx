// app/admin/inventory/[id]/edit/client.tsx
"use client";

import { useRouter } from "next/navigation";

import { ProductForm } from "@/components/inventory/ProductForm";
import type { ProductCreateInput } from "@/services/product-service";
import type { ProductWithDetails } from "@/types/domain/product";

interface EditProductClientProps {
  productId: string;
  product: ProductWithDetails;
  initialShippingDefaults: Array<{
    category: string;
    shipping_cost_cents?: number;
    default_price_cents?: number;
    default_price?: number;
  }>;
  initialBrands: Array<{
    id: string;
    label: string;
    groupKey?: string | null;
  }>;
}

export function EditProductClient({
  productId,
  product,
  initialShippingDefaults,
  initialBrands,
}: EditProductClientProps) {
  const router = useRouter();

  const handleSubmit = async (data: ProductCreateInput) => {
    const response = await fetch(`/api/admin/products/${productId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (response.ok) {
      router.push("/admin/inventory");
      return;
    }

    let message = "Failed to update product";
    try {
      const payload = await response.json();
      if (payload?.error) {
        message = payload.error;
      }
    } catch {
      // ignore parse errors
    }
    throw new Error(message);
  };

  const handleCancel = () => {
    router.push("/admin/inventory");
  };

  const initialData = {
    id: product.id,
    title_raw:
      product.title_raw ||
      `${product.brand} ${product.model ?? ""} ${product.name}`.trim(),
    category: product.category,
    condition: product.condition,
    condition_note: product.condition_note || undefined,
    description: product.description || undefined,
    shipping_override_cents: product.shipping_override_cents ?? undefined,
    go_live_at: product.go_live_at ?? undefined,
    variants: product.variants,
    images: product.images,
    tags: (product.tags ?? []).map((tag) => ({
      label: tag.label,
      group_key: tag.group_key,
    })),
  };

  return (
    <ProductForm
      initialData={initialData}
      onSubmit={handleSubmit}
      onCancel={handleCancel}
      initialShippingDefaults={initialShippingDefaults}
      initialBrands={initialBrands}
    />
  );
}
