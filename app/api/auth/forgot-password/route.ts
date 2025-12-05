// app/api/auth/forgot-password/route.ts
import { NextRequest, NextResponse } from "next/server";
import { AuthService } from "@/services/auth-service";

export async function POST(req: NextRequest) {
  const { email } = await req.json();

  try {
    await AuthService.sendPasswordReset(email);
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message ?? "Reset failed" },
      { status: 400 }
    );
  }
}
