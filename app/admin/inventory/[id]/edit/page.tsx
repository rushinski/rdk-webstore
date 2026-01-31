// app/admin/inventory/[id]/edit/page.tsx

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getEditFormInitialData } from "./actions";
import { EditProductClient } from "./client";

interface EditProductPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditProductPage(props: EditProductPageProps) {
  // Await the params prop first, then destructure
  const params = await props.params;
  const { id } = params;

  // SERVER-SIDE: Load all data before rendering
  const initialData = await getEditFormInitialData(id);

  // If product not found, show 404
  if (!initialData.product) {
    notFound();
  }

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
          <h1 className="text-xl md:text-3xl font-bold text-white">Edit Product</h1>
          <p className="text-sm md:text-base text-gray-400">Update product details</p>
        </div>
      </div>

      <EditProductClient
        productId={id}
        product={initialData.product}
        initialShippingDefaults={initialData.shippingDefaults}
        initialBrands={initialData.brands}
      />
    </div>
  );
}
