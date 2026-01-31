// app/admin/inventory/create/client.tsx
"use client";

import { useRouter } from "next/navigation";

import { ProductForm } from "@/components/inventory/ProductForm";
import type { ProductCreateInput } from "@/services/product-service";

interface CreateProductClientProps {
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

export function CreateProductClient({
  initialShippingDefaults,
  initialBrands,
}: CreateProductClientProps) {
  const router = useRouter();

  const handleSubmit = async (data: ProductCreateInput) => {
    const response = await fetch("/api/admin/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (response.ok) {
      router.push("/admin/inventory");
    } else {
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
    }
  };

  const handleCancel = () => {
    router.push("/admin/inventory");
  };

  return (
    <ProductForm
      onSubmit={handleSubmit}
      onCancel={handleCancel}
      initialShippingDefaults={initialShippingDefaults}
      initialBrands={initialBrands}
    />
  );
}
