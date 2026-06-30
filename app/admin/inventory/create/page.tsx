import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { AdminPageHeader } from "@/components/admin/ui/AdminPageHeader";

import { getFormInitialData } from "./actions";
import { CreateProductClient } from "./client";

export default async function CreateProductPage() {
  const initialData = await getFormInitialData();

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
        title="Create Product"
        description="Add a new product to your inventory using the standard product workflow."
      />

      <CreateProductClient
        initialShippingDefaults={initialData.shippingDefaults}
        initialBrands={initialData.brands}
      />
    </div>
  );
}
