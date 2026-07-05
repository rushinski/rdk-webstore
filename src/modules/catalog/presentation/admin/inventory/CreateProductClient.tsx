"use client";

import { useRouter } from "next/navigation";

import { ProductForm } from "@/components/inventory/ProductForm";
import type {
  ProductFormBrandOption,
  ProductFormShippingDefault,
  ProductFormSubmitInput,
} from "@/modules/catalog/presentation/admin/inventory/productEditorTypes";

type CreateProductClientProps = {
  initialShippingDefaults: ProductFormShippingDefault[];
  initialBrands: ProductFormBrandOption[];
};

export function CreateProductClient({
  initialShippingDefaults,
  initialBrands,
}: CreateProductClientProps) {
  const router = useRouter();

  const handleSubmit = async (data: ProductFormSubmitInput) => {
    const response = await fetch("/api/admin/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (response.ok) {
      router.push("/admin/inventory");
      return;
    }

    let message = "Failed to create product";
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

  return (
    <ProductForm
      onSubmit={handleSubmit}
      onCancel={() => router.push("/admin/inventory")}
      initialShippingDefaults={initialShippingDefaults}
      initialBrands={initialBrands}
    />
  );
}
