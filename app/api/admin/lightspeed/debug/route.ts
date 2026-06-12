import { NextResponse } from "next/server";

import { requireAdminApi } from "@/lib/auth/session";
import { ensureTenantId } from "@/lib/auth/tenant";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { LightspeedSettingsRepository } from "@/repositories/lightspeed-settings-repo";
import { LightspeedReconciliationSyncService } from "@/services/lightspeed-reconciliation-sync-service";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const productId = searchParams.get("productId");
  const reconciliationProductId = searchParams.get("reconciliationProductId");

  try {
    const session = await requireAdminApi();
    const supabase = await createSupabaseServerClient();
    const tenantId = await ensureTenantId(session, supabase);

    const settingsRepo = new LightspeedSettingsRepository(supabase);
    const connection = await settingsRepo.getConnectionByTenant(tenantId);
    if (!connection.domainPrefix || !connection.accessToken) {
      return NextResponse.json({ error: "Lightspeed not connected" }, { status: 400 });
    }

    if (reconciliationProductId) {
      const reconciliationService = new LightspeedReconciliationSyncService(supabase);
      const diagnosis = await reconciliationService.diagnoseRemoteProduct({
        tenantId,
        remoteProductId: reconciliationProductId,
      });

      return NextResponse.json({
        reconciliationProductId,
        diagnosis,
      });
    }

    const baseUrl = `https://${connection.domainPrefix}.retail.lightspeed.app/api/2026-04`;
    const headers = {
      Authorization: `Bearer ${connection.accessToken}`,
      Accept: "application/json",
    };

    if (productId) {
      // Fetch the product to get its family_id
      const productRes = await fetch(`${baseUrl}/products/${productId}`, { headers });
      const productRaw = await productRes.json();
      const productData = Array.isArray(productRaw?.data)
        ? productRaw.data[0]
        : (productRaw?.data ?? productRaw);
      const familyId = productData?.family_id ?? null;

      // Try all known inventory URL patterns for Lightspeed X-Series
      const inventoryUrls = [
        `/inventory/${productId}?page_size=50`,
        `/inventory/${productId}?variants=true&page_size=50`,
        `/inventory/${productId}?variants=false&page_size=50`,
        ...(familyId && familyId !== productId
          ? [
              `/inventory/${familyId}?page_size=50`,
              `/inventory/${familyId}?variants=true&page_size=50`,
            ]
          : []),
      ];

      const inventoryResults: Record<string, unknown> = {};
      for (const path of inventoryUrls) {
        const res = await fetch(`${baseUrl}${path}`, { headers });
        const text = await res.text();
        let parsed: unknown;
        try {
          parsed = JSON.parse(text);
        } catch {
          parsed = text;
        }
        inventoryResults[path] = { status: res.status, body: parsed };
      }

      // Also try the product with inventory include param
      const productWithInventoryRes = await fetch(
        `${baseUrl}/products/${productId}?include_inventory=true`,
        { headers },
      );
      const productWithInventoryRaw = await productWithInventoryRes
        .json()
        .catch(() => null);

      return NextResponse.json({
        productId,
        familyId,
        product: { status: productRes.status, data: productRaw },
        product_with_include_inventory: {
          status: productWithInventoryRes.status,
          data: productWithInventoryRaw,
        },
        inventory_attempts: inventoryResults,
      });
    }

    // No productId: fetch first page of products, find first product with variants
    const listRes = await fetch(`${baseUrl}/products?page_size=10&include_images=false`, {
      headers,
    });
    const listRaw = await listRes.json();

    const products: Array<{
      id: string;
      name?: string;
      has_variants?: boolean;
      variant_parent_id?: string;
    }> = Array.isArray(listRaw?.data)
      ? listRaw.data
      : listRaw?.data
        ? [listRaw.data]
        : [];

    const parentProducts = products.filter((p) => !p.variant_parent_id);
    const withVariants = parentProducts.find((p) => p.has_variants);
    const sampleProduct = withVariants ?? parentProducts[0];

    return NextResponse.json({
      instruction:
        "Pass ?productId=ID to inspect raw Lightspeed product/inventory responses, or ?reconciliationProductId=ID to see how sync classification matched it.",
      listStatus: listRes.status,
      totalInPage: products.length,
      parentProducts: parentProducts.map((p) => ({
        id: p.id,
        name: p.name,
        has_variants: p.has_variants,
      })),
      suggestedProductId: sampleProduct?.id ?? null,
      rawFirstProduct: sampleProduct ?? null,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
