// app/api/admin/products/[id]/duplicate/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth/session';
import { ProductService } from '@/services/product-service';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAdmin();
    const supabase = await createSupabaseServerClient();
    const service = new ProductService(supabase);

    if (!session.profile?.tenant_id) {
      return NextResponse.json(
        { error: "Missing tenant for admin user." },
        { status: 400 }
      );
    }

    const product = await service.duplicateProduct(params.id, {
      userId: session.user.id,
      tenantId: session.profile.tenant_id,
      marketplaceId: null,
      sellerId: null,
    });

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error('Admin duplicate product error:', error);
    return NextResponse.json(
      { error: 'Failed to duplicate product' },
      { status: 500 }
    );
  }
}
