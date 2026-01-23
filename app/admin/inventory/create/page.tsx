// app/admin/inventory/create/page.tsx

"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { ProductForm } from "@/components/inventory/ProductForm";
import type { ProductCreateInput } from "@/services/product-service";

export default function CreateProductPage() {
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
      } catch (error) {
        // ignore parse errors
      }
      throw new Error(message);
    }
  };

  const handleCancel = () => {
    router.push("/admin/inventory");
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
          <h1 className="text-3xl font-bold text-white">Create Product</h1>
          <p className="text-gray-400">Add a new product to your inventory</p>
        </div>
      </div>

      <ProductForm onSubmit={handleSubmit} onCancel={handleCancel} />
    </div>
  );
}
