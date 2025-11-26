import { NextRequest, NextResponse } from "next/server";
import { createRlsClient } from "@/lib/supabase";
import { ProductsRepo } from "@/repositories/products-repo";
import { CatalogService } from "@/services/catalog-service";

export async function GET(req: NextRequest) {
  const requestId = crypto.randomUUID();
  const params = new URL(req.url).searchParams;

  const supabase = createRlsClient(undefined, requestId);

  const catalog = new CatalogService({
    repos: { products: new ProductsRepo({ supabase, requestId }) },
    requestId,
  });

  const data = await catalog.searchProducts({
    q: params.get("q") ?? undefined,
    brand: params.get("brand") ?? undefined,
    shoeSize: params.get("shoeSize") ? Number(params.get("shoeSize")) : undefined,
    clothingSize: params.get("clothingSize") ?? undefined,
  });

  return NextResponse.json({ data, requestId });
}
