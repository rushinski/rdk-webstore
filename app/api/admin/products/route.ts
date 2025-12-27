// app/api/admin/products/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth/session';
import { ProductService, type ProductCreateInput } from '@/services/product-service';

export async function POST(request: NextRequest) {
  try {
    const session = await requireAdmin();
    const supabase = await createSupabaseServerClient();
    const service = new ProductService(supabase);

    const input: ProductCreateInput = await request.json();
    if (!session.profile?.tenant_id) {
      return NextResponse.json(
        { error: "Missing tenant for admin user." },
        { status: 400 }
      );
    }

    const product = await service.createProduct(input, {
      userId: session.user.id,
      tenantId: session.profile.tenant_id,
      marketplaceId: null,
      sellerId: null,
    });

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error('Admin create product error:', error);
    return NextResponse.json(
      { error: 'Failed to create product' },
      { status: 500 }
    );
  }
}
