
// app/api/store/products/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { ProductRepository, type ProductFilters } from '@/repositories/product-repo';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const repo = new ProductRepository(supabase);

    const searchParams = request.nextUrl.searchParams;

    const filters: ProductFilters = {
      q: searchParams.get('q') || undefined,
      category: searchParams.getAll('category').filter(Boolean),
      brand: searchParams.getAll('brand').filter(Boolean),
      sizeShoe: searchParams.getAll('sizeShoe').filter(Boolean),
      sizeClothing: searchParams.getAll('sizeClothing').filter(Boolean),
      condition: searchParams.getAll('condition').filter(Boolean),
      sort: (searchParams.get('sort') as any) || 'newest',
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '20'),
    };

    const result = await repo.list(filters);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Store products API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    );
  }
}