import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { TwoFAService } from "@/services/twofa-service";

export async function POST(req: NextRequest) {
  const { code } = await req.json();

  const supabase = await createSupabaseServerClient(); // FIX
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ok = await TwoFAService.verifyCode(user.id, code);
  if (!ok) return NextResponse.json({ error: "Invalid code" }, { status: 400 });

  return NextResponse.json({ ok: true });
}

