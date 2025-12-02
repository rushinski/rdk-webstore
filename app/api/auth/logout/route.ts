// src/app/api/auth/logout/route.ts
import { NextRequest, NextResponse } from "next/server";
import { AuthService } from "@/services/auth-service";

export async function POST(_req: NextRequest) {
  try {
    await AuthService.signOut();
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message ?? "Logout failed" },
      { status: 400 }
    );
  }
}
