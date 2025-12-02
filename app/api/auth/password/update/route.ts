// app/api/auth/password/update/route.ts
import { NextRequest, NextResponse } from "next/server";
import { AuthService } from "@/services/auth-service";

export async function POST(req: NextRequest) {
  const { password } = await req.json();

  try {
    await AuthService.updatePassword(password);
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message ?? "Password update failed" },
      { status: 400 }
    );
  }
}
