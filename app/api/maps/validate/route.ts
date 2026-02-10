// app/api/maps/validate/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { HereMapsService } from "@/services/here-maps-service";
import { getRequestIdFromHeaders } from "@/lib/http/request-id";
import { logError } from "@/lib/utils/log";

const addressSchema = z.object({
  line1: z.string().min(1).max(200),
  city: z.string().min(1).max(100),
  state: z.string().length(2),
  postal_code: z.string().min(3).max(20),
  country: z.string().length(2).default("US"),
});

export async function POST(request: NextRequest) {
  const requestId = getRequestIdFromHeaders(request.headers);

  try {
    const body = await request.json().catch(() => null);
    const parsed = addressSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid address", issues: parsed.error.format(), requestId },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    const hereMapsService = new HereMapsService();
    const validationResult = await hereMapsService.validateAddress(parsed.data);

    return NextResponse.json(validationResult, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    logError(error, {
      layer: "api",
      requestId,
      route: "/api/maps/validate",
    });

    return NextResponse.json(
      { error: "Validation failed", requestId },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
