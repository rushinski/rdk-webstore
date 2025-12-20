// app/api/account/shipping/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { requireUser } from '@/services/session-service';
import { ShippingRepository } from '@/repositories/shipping-repo';
import type { ShippingProfile } from '@/types/views/shipping'; 

export async function GET(request: NextRequest) {
  try {
    const session = await requireUser();
    const supabase = await createSupabaseServerClient();
    const repo = new ShippingRepository(supabase);

    const profile = await repo.getByUserId(session.user.id);

    return NextResponse.json(profile || {});
  } catch (error) {
    console.error('Get shipping profile error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch shipping profile' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireUser();
    const supabase = await createSupabaseServerClient();
    const repo = new ShippingRepository(supabase);

    const input: Omit<ShippingProfile, 'user_id' | 'updated_at'> = await request.json();
    
    const profile = await repo.upsert({
      user_id: session.user.id,
      ...input,
      updated_at: new Date().toISOString(),
    });

    return NextResponse.json(profile);
  } catch (error) {
    console.error('Save shipping profile error:', error);
    return NextResponse.json(
      { error: 'Failed to save shipping profile' },
      { status: 500 }
    );
  }
}