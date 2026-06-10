import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

type BackfillTarget = {
  localProductId: string;
  remoteProductId: string;
};

function parseArgs(argv: string[]) {
  let tenantId: string | null = null;
  let write = false;
  let limit: number | null = null;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--write") {
      write = true;
      continue;
    }
    if (arg === "--tenant" && argv[index + 1]) {
      tenantId = argv[index + 1];
      index += 1;
      continue;
    }
    if (arg === "--limit" && argv[index + 1]) {
      const parsed = Number.parseInt(argv[index + 1], 10);
      if (Number.isFinite(parsed) && parsed > 0) {
        limit = parsed;
      }
      index += 1;
    }
  }

  return { tenantId, write, limit };
}

async function resolveTenantId(explicitTenantId: string | null) {
  const { createSupabaseAdminClient } = await import("@/lib/supabase/service-role");
  const { TenantRepository } = await import("@/repositories/tenant-repo");
  if (explicitTenantId) {
    return explicitTenantId;
  }

  const supabase = createSupabaseAdminClient();
  const tenantRepo = new TenantRepository(supabase);
  return tenantRepo.getFirstTenantId();
}

async function listTargets(
  tenantId: string,
  limit: number | null,
): Promise<BackfillTarget[]> {
  const { createSupabaseAdminClient } = await import("@/lib/supabase/service-role");
  const { LightspeedLinksRepository } = await import(
    "@/repositories/lightspeed-links-repo"
  );
  const supabase = createSupabaseAdminClient();
  const linksRepo = new LightspeedLinksRepository(supabase);
  const links = await linksRepo.listByTenant(tenantId);
  const byProduct = new Map<string, string>();

  for (const link of links) {
    if (!link.product_id) {
      continue;
    }

    const remoteProductId =
      link.lightspeed_family_id ??
      link.lightspeed_product_id ??
      link.lightspeed_variant_id ??
      null;

    if (!remoteProductId || byProduct.has(link.product_id)) {
      continue;
    }

    byProduct.set(link.product_id, remoteProductId);
  }

  const targets = Array.from(byProduct.entries()).map(
    ([localProductId, remoteProductId]) => ({
      localProductId,
      remoteProductId,
    }),
  );

  return typeof limit === "number" ? targets.slice(0, limit) : targets;
}

async function main() {
  const { createSupabaseAdminClient } = await import("@/lib/supabase/service-role");
  const { LightspeedClient } = await import("@/lib/lightspeed/client");
  const { env } = await import("@/config/env");
  const { tenantId: tenantArg, write, limit } = parseArgs(process.argv.slice(2));
  const tenantId = await resolveTenantId(tenantArg);

  if (!tenantId) {
    throw new Error("Unable to determine tenant id. Pass --tenant <id>.");
  }

  if (!env.LIGHTSPEED_ACCESS_TOKEN.trim() || !env.LIGHTSPEED_DOMAIN_PREFIX.trim()) {
    throw new Error("Lightspeed env vars are missing.");
  }

  const targets = await listTargets(tenantId, limit);
  if (targets.length === 0) {
    console.info("No Lightspeed-linked products found for backfill.");
    return;
  }

  const supabase = createSupabaseAdminClient();
  const client = new LightspeedClient({
    domainPrefix: env.LIGHTSPEED_DOMAIN_PREFIX,
    accessToken: env.LIGHTSPEED_ACCESS_TOKEN,
  });

  let scanned = 0;
  let matched = 0;
  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (const target of targets) {
    scanned += 1;

    try {
      const remote = await client.getProduct(target.remoteProductId);
      const createdAt = remote?.created_at?.trim() ?? "";

      if (!createdAt) {
        skipped += 1;
        console.info(
          `[skip] ${target.localProductId} <- ${target.remoteProductId} (missing remote created_at)`,
        );
        continue;
      }

      matched += 1;

      if (write) {
        const { error } = await supabase
          .from("products")
          .update({ created_at: createdAt })
          .eq("id", target.localProductId);

        if (error) {
          throw error;
        }

        updated += 1;
        console.info(
          `[write] ${target.localProductId} <- ${target.remoteProductId} (${createdAt})`,
        );
      } else {
        console.info(
          `[dry-run] ${target.localProductId} <- ${target.remoteProductId} (${createdAt})`,
        );
      }
    } catch (error) {
      failed += 1;
      const message = error instanceof Error ? error.message : String(error);
      console.error(
        `[error] ${target.localProductId} <- ${target.remoteProductId}: ${message}`,
      );
    }
  }

  console.info("");
  console.info(
    JSON.stringify(
      {
        tenantId,
        mode: write ? "write" : "dry-run",
        scanned,
        matched,
        updated,
        skipped,
        failed,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});
