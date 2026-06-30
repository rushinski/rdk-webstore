// app/admin/inventory/[id]/edit/page.tsx
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AdminPageHeader } from "@/components/admin/ui/AdminPageHeader";

import { getEditFormInitialData } from "./actions";
import { EditProductClient } from "./client";

interface EditProductPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditProductPage(props: EditProductPageProps) {
  const params = await props.params;
  const { id } = params;

  const initialData = await getEditFormInitialData(id);

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
        productId={id}
        product={initialData.product}
        isArchived={Boolean(initialData.product.archived_at)}
        initialShippingDefaults={initialData.shippingDefaults}
        initialBrands={initialData.brands}
      />
    </div>
  );
}
