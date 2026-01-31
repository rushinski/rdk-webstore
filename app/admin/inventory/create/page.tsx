// app/admin/inventory/create/page.tsx (SERVER-SIDE VERSION)

import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { getFormInitialData } from "./actions";
import { CreateProductClient } from "./client";

export default async function CreateProductPage() {
  // SERVER-SIDE: Load data before rendering
  const initialData = await getFormInitialData();

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex items-center gap-3 md:gap-4">
        <Link
          href="/admin/inventory"
          className="text-gray-400 hover:text-white transition"
        >
          <ArrowLeft className="w-5 h-5 md:w-6 md:h-6" />
        </Link>
        <div>
          <h1 className="text-xl md:text-3xl font-bold text-white">Create Product</h1>
          <p className="text-sm md:text-base text-gray-400">
            Add a new product to your inventory
          </p>
        </div>
      </div>

      <CreateProductClient
        initialShippingDefaults={initialData.shippingDefaults}
        initialBrands={initialData.brands}
      />
    </div>
  );
}
