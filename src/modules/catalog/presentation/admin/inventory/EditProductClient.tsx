"use client";

import { useRouter } from "next/navigation";

import { AdminSectionCard } from "@/components/admin/ui/AdminSectionCard";
import { adminButtonStyles } from "@/components/admin/ui/adminButtonStyles";
import { ProductForm } from "@/components/inventory/ProductForm";
import type {
  ProductFormBrandOption,
  ProductFormShippingDefault,
  ProductFormSubmitInput,
} from "@/modules/catalog/presentation/admin/inventory/productEditorTypes";
import type { ProductWithDetails } from "@/types/domain/product";

type EditProductClientProps = {
  productId: string;
  product: ProductWithDetails;
  isArchived?: boolean;
  initialShippingDefaults: ProductFormShippingDefault[];
  initialBrands: ProductFormBrandOption[];
};

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

  const handleSubmit = async (data: ProductFormSubmitInput) => {
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
              onClick={() => router.push("/admin/inventory")}
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
      onCancel={() => router.push("/admin/inventory")}
      initialShippingDefaults={initialShippingDefaults}
      initialBrands={initialBrands}
    />
  );
}
