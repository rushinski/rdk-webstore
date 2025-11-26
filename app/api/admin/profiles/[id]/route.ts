import { NextRequest, NextResponse } from "next/server";
import { createRlsClient } from "@/lib/supabase";

// Repositories
import { ProfilesRepo } from "@/repositories/profiles-repo";
import { ProductsRepo } from "@/repositories/products-repo"; 
// (AdminService requires both)

// Services
import { AdminService } from "@/services/admin-service";

export async function GET(
  req: NextRequest,
  context: { params: { id: string } }
) {
  const requestId = crypto.randomUUID();
  const token = req.headers.get("Authorization")?.replace("Bearer ", "") ?? null;

  const supabase = createRlsClient(token ?? undefined, requestId);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const service = new AdminService({
    repos: {
      products: new ProductsRepo({ supabase, requestId, userId: user.id }),
      profiles: new ProfilesRepo({ supabase, requestId, userId: user.id }),
    },
    requestId,
    userId: user.id,
  });

  const profile = await service.getProfile(context.params.id);

  return NextResponse.json({ data: profile, requestId });
}
