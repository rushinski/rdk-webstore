// app/admin/inventory/[id]/edit/page.tsx

'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ProductForm } from '@/components/inventory/ProductForm';
import type { ProductCreateInput } from '@/services/product-service';
import type { ProductWithDetails } from "@/types/views/product";
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function EditProductPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [product, setProduct] = useState<ProductWithDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadProduct();
  }, [params.id]);

  const loadProduct = async () => {
    try {
      const response = await fetch(`/api/store/products/${params.id}`);
      const data = await response.json();
      setProduct(data);
    } catch (error) {
      console.error('Load product error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (data: ProductCreateInput) => {
    const response = await fetch(`/api/admin/products/${params.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (response.ok) {
      router.push('/admin/inventory');
    } else {
      throw new Error('Failed to update product');
    }
  };

  const handleCancel = () => {
    router.push('/admin/inventory');
  };

  if (isLoading) {
    return <div className="text-center py-12 text-gray-400">Loading...</div>;
  }

  if (!product) {
    return <div className="text-center py-12 text-gray-400">Product not found</div>;
  }

  const initialData = {
    id: product.id,
    brand: product.brand,
    name: product.name,
    category: product.category,
    condition: product.condition,
    condition_note: product.condition_note || undefined,
    description: product.description || undefined,
    shipping_override_cents: product.shipping_override_cents ?? undefined,
    variants: product.variants,
    images: product.images,
    tags: product.tags.map((tag) => ({
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
