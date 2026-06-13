import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

async function main() {
  const sku = process.argv[2];
  const remoteId = process.argv[3];
  const tenantId = process.argv[4] ?? "6d7daa63-433a-4ed0-9078-ca6f92118d1f";

  if (!sku || !remoteId) {
    throw new Error(
      "Usage: tsx scripts/debug-reconciliation-product.ts <sku> <remoteId> [tenantId]",
    );
  }

  const { createSupabaseAdminClient } = await import("@/lib/supabase/service-role");
  const { LightspeedClient } = await import("@/lib/lightspeed/client");
  const { env } = await import("@/config/env");
  const { LightspeedReconciliationSyncService } = await import(
    "@/services/lightspeed-reconciliation-sync-service"
  );
  const { ProductRepository } = await import("@/repositories/product-repo");
  const { LightspeedLinksRepository } = await import(
    "@/repositories/lightspeed-links-repo"
  );

  const supabase = createSupabaseAdminClient();
  const reconciliationService = new LightspeedReconciliationSyncService(supabase);
  const productRepo = new ProductRepository(supabase);
  const linksRepo = new LightspeedLinksRepository(supabase);
  const client = new LightspeedClient({
    domainPrefix: env.LIGHTSPEED_DOMAIN_PREFIX,
    accessToken:
      process.env.LIGHTSPEED_AUDIT_ACCESS_TOKEN?.trim() || env.LIGHTSPEED_ACCESS_TOKEN,
  });

  const [
    variants,
    linksBySku,
    linksByRemote,
    remote,
    diagnosis,
    preview,
    activeProducts,
    archivedProducts,
    allLinks,
  ] = await Promise.all([
    supabase
      .from("product_variants")
      .select(
        "id, sku, size_label, stock, product:products(id, tenant_id, name, brand, is_active, archived_at, is_out_of_stock)",
      )
      .eq("sku", sku),
    supabase.from("lightspeed_product_links").select("*").eq("external_sku", sku),
    supabase
      .from("lightspeed_product_links")
      .select("*")
      .or(
        `lightspeed_family_id.eq.${remoteId},lightspeed_product_id.eq.${remoteId},lightspeed_variant_id.eq.${remoteId}`,
      ),
    client.getProduct(remoteId),
    reconciliationService.diagnoseRemoteProduct({
      tenantId,
      remoteProductId: remoteId,
    }),
    reconciliationService.preview({
      tenantId,
    }),
    productRepo.listForReconciliation(tenantId, "active"),
    productRepo.listForReconciliation(tenantId, "archived"),
    linksRepo.listByTenant(tenantId),
  ]);

  const importMatch =
    preview.imports.find((item) => item.remoteProductId === remoteId) ?? null;
  const noChangeMatch =
    preview.noChanges.find((item) => item.remoteProductId === remoteId) ?? null;
  const editMatch =
    preview.edits.find((item) => item.remoteProductId === remoteId) ?? null;
  const restoreMatch =
    preview.restores.find((item) => item.remoteProductId === remoteId) ?? null;
  const conflictMatch =
    preview.conflicts.find((item) => item.remoteProductId === remoteId) ?? null;

  console.info(
    JSON.stringify(
      {
        variantsError: variants.error?.message ?? null,
        variants: variants.data ?? [],
        linksBySkuError: linksBySku.error?.message ?? null,
        linksBySku: linksBySku.data ?? [],
        linksByRemoteError: linksByRemote.error?.message ?? null,
        linksByRemote: linksByRemote.data ?? [],
        remote,
        diagnosis,
        activeContainsProduct: activeProducts.some(
          (product) =>
            product.id ===
            ((variants.data?.[0] as { product?: { id?: string } } | undefined)?.product
              ?.id ?? null),
        ),
        archivedContainsProduct: archivedProducts.some(
          (product) =>
            product.id ===
            ((variants.data?.[0] as { product?: { id?: string } } | undefined)?.product
              ?.id ?? null),
        ),
        activeProductCount: activeProducts.length,
        archivedProductCount: archivedProducts.length,
        linkCount: allLinks.length,
        previewBucket: {
          importMatch,
          noChangeMatch,
          editMatch:
            editMatch === null
              ? null
              : {
                  websiteProductId: editMatch.websiteProductId,
                  reason: editMatch.reason,
                  diff: editMatch.diff,
                },
          restoreMatch,
          conflictMatch,
        },
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  const message = error instanceof Error ? (error.stack ?? error.message) : String(error);
  console.error(message);
  process.exitCode = 1;
});
