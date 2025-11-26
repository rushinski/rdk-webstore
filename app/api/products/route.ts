import { NextRequest, NextResponse } from "next/server";
import { createRlsClient } from "@/lib/supabase";
import { ProductsRepo } from "@/repositories/products-repo";
import { CatalogService } from "@/services/catalog-service";
import { z } from "zod";

const paramsSchema = z.object({
  page: z.string().optional(),
  pageSize: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const requestId = crypto.randomUUID();

  const { page, pageSize } = paramsSchema.parse({
    page: searchParams.get("page"),
    pageSize: searchParams.get("pageSize"),
  });

  const supabase = createRlsClient(undefined, requestId);

  const catalog = new CatalogService({
    repos: { products: new ProductsRepo({ supabase, requestId }) },
    requestId,
  });

  const data = await catalog.listProducts(
    Number(page ?? 1),
    Number(pageSize ?? 20)
  );

  return NextResponse.json({ data, requestId });
}
