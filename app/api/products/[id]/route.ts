import { NextRequest, NextResponse } from "next/server";
import { createRlsClient } from "@/lib/supabase";
import { ProductsRepo } from "@/repositories/products-repo";
import { CatalogService } from "@/services/catalog-service";

export async function GET(
  req: NextRequest,
  context: { params: { id: string } }
) {
  const requestId = crypto.randomUUID();
  const supabase = createRlsClient(undefined, requestId);

  const catalog = new CatalogService({
    repos: { products: new ProductsRepo({ supabase, requestId }) },
    requestId,
  });

  const product = await catalog.getProduct(context.params.id);

  return NextResponse.json({ data: product, requestId });
}
