import { NextRequest, NextResponse } from "next/server";
import { createRlsClient } from "@/lib/supabase";

// Repositories
import { ProductsRepo } from "@/repositories/products-repo";
import { ProfilesRepo } from "@/repositories/profiles-repo";

// Services
import { AdminService } from "@/services/admin-service";

export async function PUT(
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

  const updates = await req.json();

  const service = new AdminService({
    repos: {
      products: new ProductsRepo({ supabase, requestId, userId: user.id }),
      profiles: new ProfilesRepo({ supabase, requestId, userId: user.id }),
    },
    requestId,
    userId: user.id,
  });

  const updated = await service.updateProduct(context.params.id, updates);
  return NextResponse.json({ data: updated, requestId });
}

export async function DELETE(
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

  await service.deleteProduct(context.params.id);

  return NextResponse.json({ success: true, requestId });
}
