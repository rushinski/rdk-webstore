import { NextResponse } from "next/server";
import { AdminService } from "@/services/admin-service";

export async function POST(req: Request) {
  try {
    const { userId } = await req.json();
    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    const result = await AdminService.promoteUser(userId);
    return NextResponse.json(result, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message ?? "Internal error" },
      { status: err.message === "Forbidden: admin only" ? 403 : 500 }
    );
  }
}
