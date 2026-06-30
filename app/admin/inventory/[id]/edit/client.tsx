// app/admin/inventory/[id]/edit/client.tsx
"use client";

import { useRouter } from "next/navigation";

import { AdminSectionCard } from "@/components/admin/ui/AdminSectionCard";
import { adminButtonStyles } from "@/components/admin/ui/adminButtonStyles";
import { ProductForm } from "@/components/inventory/ProductForm";
import type { ProductCreateInput } from "@/services/product-service";
import type { ProductWithDetails } from "@/types/domain/product";

interface EditProductClientProps {
  productId: string;
  product: ProductWithDetails;
  isArchived?: boolean;
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
  isArchived = false,
  initialShippingDefaults,
  initialBrands,
}: EditProductClientProps) {
  const router = useRouter();

  const handleRestore = async () => {
    const response = await fetch(`/api/admin/products/${productId}?action=restore`, {
      method: "PATCH",
    });

    if (!response.ok) {
      let message = "Failed to restore product";
      try {
        const payload = await response.json();
        if (payload?.error) {
          message = payload.error;
        }
      } catch {
        // ignore parse errors
      }
      throw new Error(message);
    }

    router.push("/admin/inventory?stockStatus=archived");
    router.refresh();
  };

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
    name: product.name,
    category: product.category,
    condition: product.condition,
    description: product.description || undefined,
    size_type: product.size_type,
    shipping_price_cents: product.shipping_price_cents ?? null,
    go_live_at: product.go_live_at ?? undefined,
    variants: product.variants,
    images: product.images,
    tags: (product.tags ?? []).map((tag) => ({
      label: tag.label,
      group_key: tag.group_key,
    })),
  };

  if (isArchived) {
    return (
      <AdminSectionCard title="Archived Product">
        <div className="space-y-4">
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-brand-text">{product.name}</h2>
            <p className="text-sm text-brand-muted">
              Archived products are read-only until restored.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => void handleRestore()}
              className={adminButtonStyles.primary}
            >
              Restore Product
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className={adminButtonStyles.secondary}
            >
              Back To Inventory
            </button>
          </div>
        </div>
      </AdminSectionCard>
    );
  }

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
