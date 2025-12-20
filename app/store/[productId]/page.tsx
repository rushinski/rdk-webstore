// app/store/[productId]/page.tsx

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { ProductRepository } from '@/repositories/product-repo';
import { ProductDetail } from '@/components/store/ProductDetail';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default async function ProductDetailPage({
  params,
}: {
  params: { productId: string };
}) {
  const supabase = await createSupabaseServerClient();
  const repo = new ProductRepository(supabase);

  const product = await repo.getById(params.productId);

  if (!product) {
    notFound();
  }

  return (
    <div>
      <div className="max-w-7xl mx-auto px-4 py-4">
        <Link
          href="/store"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Store
        </Link>
      </div>
      <ProductDetail product={product} />
    </div>
  );
}
