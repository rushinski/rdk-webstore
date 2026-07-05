import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AdminPageHeader } from "@/modules/shared/presentation/admin/ui/AdminPageHeader";
import { getEditProductFormInitialData } from "@/modules/catalog/application/adminInventory";
import { EditProductClient } from "@/modules/catalog/presentation/admin/inventory/EditProductClient";

export async function EditProductPageContent({ productId }: { productId: string }) {
  const initialData = await getEditProductFormInitialData(productId);

  if (!initialData.product) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/admin/inventory"
          className="inline-flex items-center text-brand-muted transition hover:text-brand-text"
          aria-label="Back to inventory"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
      </div>

      <AdminPageHeader
        title="Edit Product"
        description="Update inventory details using the same workflow as product creation."
      />

      <EditProductClient
        productId={productId}
        product={initialData.product}
        isArchived={Boolean(initialData.product.archived_at)}
        initialShippingDefaults={initialData.shippingDefaults}
        initialBrands={initialData.brands}
      />
    </div>
  );
}

