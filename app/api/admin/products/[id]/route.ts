// app/api/admin/products/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/services/session-service';
import { ProductService, type ProductCreateInput } from '@/services/product-service';
import { ProductRepository } from '@/repositories/product-repo';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin();
    const supabase = await createSupabaseServerClient();
    const service = new ProductService(supabase);

    const input: ProductCreateInput = await request.json();
    const product = await service.updateProduct(params.id, input);

    return NextResponse.json(product);
  } catch (error) {
    console.error('Admin update product error:', error);
    return NextResponse.json(
      { error: 'Failed to update product' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin();
    const supabase = await createSupabaseServerClient();
    const repo = new ProductRepository(supabase);

    await repo.delete(params.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin delete product error:', error);
    return NextResponse.json(
      { error: 'Failed to delete product' },
      { status: 500 }
    );
  }
}
