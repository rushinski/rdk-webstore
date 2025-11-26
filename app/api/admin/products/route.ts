import { NextRequest, NextResponse } from "next/server";
import { createRlsClient } from "@/lib/supabase";
import { ProductsRepo } from "@/repositories/products-repo";
import { ProfilesRepo } from "@/repositories/profiles-repo";
import { AdminService } from "@/services/admin-service";

export async function GET(req: NextRequest) {
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

  const data = await service.listProducts();

  return NextResponse.json({ data, requestId });
}

export async function POST(req: NextRequest) {
  const requestId = crypto.randomUUID();
  const token = req.headers.get("Authorization")?.replace("Bearer ", "") ?? null;

  const supabase = createRlsClient(token ?? undefined, requestId);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  const service = new AdminService({
    repos: {
      products: new ProductsRepo({ supabase, requestId, userId: user.id }),
      profiles: new ProfilesRepo({ supabase, requestId, userId: user.id }),
    },
    requestId,
    userId: user.id,
  });

  const created = await service.createProduct(body);

  return NextResponse.json({ data: created, requestId });
}
