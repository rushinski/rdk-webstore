// app/api/account/addresses/[addressId]/route.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AuthError, requireUserApi } from "@/lib/auth/session";
import { AddressesRepository } from "@/repositories/addresses-repo";
import { getRequestIdFromHeaders } from "@/lib/http/request-id";
import { logError } from "@/lib/utils/log";

const paramsSchema = z.object({
  addressId: z.string().uuid(),
});

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ addressId: string }> },
) {
  const requestId = getRequestIdFromHeaders(request.headers);
  const { addressId } = await params;
  const parsed = paramsSchema.safeParse({ addressId });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid params", issues: parsed.error.format(), requestId },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const session = await requireUserApi();
    const supabase = await createSupabaseServerClient();
    const repo = new AddressesRepository(supabase);

    await repo.deleteUserAddress(session.user.id, parsed.data.addressId);

    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: error.message, requestId },
        { status: error.status, headers: { "Cache-Control": "no-store" } },
      );
    }
    logError(error, {
      layer: "api",
      requestId,
      route: "/api/account/addresses/:addressId",
    });
    return NextResponse.json(
      { error: "Failed to delete address", requestId },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
