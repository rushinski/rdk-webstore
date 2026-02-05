// app/api/admin/products/export/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/session";
import { ensureTenantId } from "@/lib/auth/tenant";
import { ProductService } from "@/services/product-service";

const querySchema = z.object({
  q: z.string().optional(),
  category: z.string().optional(),
  condition: z.string().optional(),
  stockStatus: z.enum(["in_stock", "out_of_stock", "all"]).optional(),
});

function csvEscape(value: string) {
  const v = value ?? "";
  if (/[",\n\r]/.test(v)) {
    return `"${v.replace(/"/g, '""')}"`;
  }
  return v;
}

export async function GET(request: Request) {
  const session = await requireAdmin(); // ✅ get session once

  const supabase = await createSupabaseServerClient();
  const tenantId = await ensureTenantId(session, supabase);

  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    q: url.searchParams.get("q") ?? undefined,
    category: url.searchParams.get("category") ?? undefined,
    condition: url.searchParams.get("condition") ?? undefined,
    stockStatus: (url.searchParams.get("stockStatus") ?? undefined) as
      | "in_stock"
      | "out_of_stock"
      | "all"
      | undefined,
  });

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query params" }, { status: 400 });
  }

  const { q, category, condition, stockStatus } = parsed.data;

  const service = new ProductService(supabase);
  const rows = await service.exportInventory({
    tenantId,
    q,
    category: category && category !== "all" ? [category] : undefined,
    condition: condition && condition !== "all" ? [condition] : undefined,
    includeOutOfStock: true,
    stockStatus: stockStatus ?? "in_stock",
  });

  const lines: string[] = [];
  lines.push(["SKU", "Name", "Size", "Type", "Condition", "Price", "Cost"].join(","));

  const formatMoney = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  for (const r of rows) {
    lines.push(
      [
        csvEscape(r.sku),
        csvEscape(r.name),
        csvEscape(r.size),
        csvEscape(r.type),
        csvEscape(r.condition),
        csvEscape(formatMoney(r.priceCents)),
        csvEscape(formatMoney(r.costCents)),
      ].join(","),
    );
  }

  const csv = lines.join("\n");
  const today = new Date().toISOString().slice(0, 10);

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="inventory-${today}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
