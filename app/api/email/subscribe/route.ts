// app/api/email/subscribe/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { EmailSubscriberRepository } from "@/repositories/email-subscriber-repo";

export async function POST(req: NextRequest) {
  try {
    const { email, source = 'website' } = await req.json();

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { ok: false, error: 'Email is required' },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseServerClient();
    const repo = new EmailSubscriberRepository(supabase);

    await repo.subscribe(email, source);

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('Email subscription error:', error);
    return NextResponse.json(
      { ok: false, error: 'Subscription failed' },
      { status: 500 }
    );
  }
}