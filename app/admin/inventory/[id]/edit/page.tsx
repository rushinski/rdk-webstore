"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ProductForm } from "@/components/inventory/ProductForm";
import type { ProductCreateInput } from "@/services/product-service";
import type { ProductWithDetails } from "@/types/domain/product";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { logError } from "@/lib/log";

export default function EditProductPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [product, setProduct] = useState<ProductWithDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const productId = typeof params?.id === "string" ? params.id : "";

  useEffect(() => {
    if (!productId) return;
    loadProduct(productId);
  }, [productId]);

  const loadProduct = async (id: string) => {
    try {
      const response = await fetch(`/api/store/products/${id}?includeOutOfStock=1`);
      const data = await response.json();
      if (!response.ok) {
        setProduct(null);
        return;
      }
      setProduct(data);
    } catch (error) {
      logError(error, { layer: "frontend", event: "admin_load_product" });
    } finally {
      setIsLoading(false);
    }
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

    // Mirror create-page behavior: prefer server error payload if present
    let message = "Failed to update product";
    try {
      const payload = await response.json();
      if (payload?.error) message = payload.error;
    } catch {
      // ignore parse errors
    }
    throw new Error(message);
  };

  const handleCancel = () => {
    router.push("/admin/inventory");
  };

  if (isLoading) {
    return <div className="text-center py-12 text-gray-400">Loading...</div>;
  }

  if (!product) {
    throw new Error("Product not found");
  }

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
    variants: product.variants,
    images: product.images,
    tags: (product.tags ?? []).map((tag) => ({
      label: tag.label,
      group_key: tag.group_key,
    })),
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/admin/inventory"
          className="text-gray-400 hover:text-white transition"
        >
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-white">Edit Product</h1>
          <p className="text-gray-400">Update product details</p>
        </div>
      </div>

      <ProductForm
        initialData={initialData}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
      />
    </div>
  );
}
