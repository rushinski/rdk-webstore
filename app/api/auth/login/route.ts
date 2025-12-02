import { NextRequest, NextResponse } from "next/server";
import { AuthService } from "@/services/auth-service";

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();

  try {
    const { user, profile } = await AuthService.signIn(email, password);

    if (!user) {
      return NextResponse.json(
        { ok: false, error: "Invalid credentials" },
        { status: 401 }
      );
    }

    const isAdmin = profile?.role === "admin";
    const requiresTwoFASetup = isAdmin && !profile?.twofa_enabled;

    return NextResponse.json({
      ok: true,
      isAdmin,
      requiresTwoFASetup,
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message ?? "Login failed" },
      { status: 400 }
    );
  }
}
