// app/api/admin/products/[id]/duplicate/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth/session';
import { ensureTenantId } from '@/lib/auth/tenant';
import { ProductService } from '@/services/product-service';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAdmin();
    const supabase = await createSupabaseServerClient();
    const service = new ProductService(supabase);

    const tenantId = await ensureTenantId(session, supabase);
    const product = await service.duplicateProduct(params.id, {
      userId: session.user.id,
      tenantId,
      marketplaceId: null,
      sellerId: null,
    });

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error('Admin duplicate product error:', error);
    const message =
      error instanceof Error ? error.message : 'Failed to duplicate product';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
