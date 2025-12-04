// app/api/auth/resend-verification/route.ts
import { NextRequest, NextResponse } from "next/server";
import { AuthService, type VerificationFlow } from "@/services/auth-service";

export async function POST(req: NextRequest) {
  const { email, flow }: { email?: string; flow?: VerificationFlow } =
    await req.json();

  if (!email || typeof email !== "string") {
    return NextResponse.json(
      { ok: false, error: "Email is required" },
      { status: 400 },
    );
  }

  const normalizedEmail = email.trim();
  const verificationFlow: VerificationFlow = flow === "signin" ? "signin" : "signup";

  try {
    await AuthService.resendVerification(normalizedEmail, verificationFlow);
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message ?? "Could not resend verification email." },
      { status: 400 },
    );
  }
}
