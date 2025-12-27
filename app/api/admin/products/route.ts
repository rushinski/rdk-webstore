// app/api/admin/products/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth/session';
import { ensureTenantId } from '@/lib/auth/tenant';
import { ProductService, type ProductCreateInput } from '@/services/product-service';

export async function POST(request: NextRequest) {
  try {
    const session = await requireAdmin();
    const supabase = await createSupabaseServerClient();
    const service = new ProductService(supabase);

    const input: ProductCreateInput = await request.json();
    const tenantId = await ensureTenantId(session, supabase);
    const product = await service.createProduct(input, {
      userId: session.user.id,
      tenantId,
      marketplaceId: null,
      sellerId: null,
    });

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error('Admin create product error:', error);
    const message =
      error instanceof Error ? error.message : 'Failed to create product';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
