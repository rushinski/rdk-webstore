// app/api/auth/signup/route.ts
import { NextRequest, NextResponse } from "next/server";
import { AuthService } from "@/services/auth-service";

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();

  try {
    await AuthService.signUp(email, password);
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message ?? "Sign up failed" },
      { status: 400 }
    );
  }
}
