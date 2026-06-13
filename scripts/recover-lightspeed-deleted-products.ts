import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { loadEnvConfig } from "@next/env";

import {
  extractDeletedProductRecord,
  formatDeletedProductRecordsAsCsv,
  type LightspeedAuditLogEvent,
} from "@/lib/lightspeed/audit-recovery";

loadEnvConfig(process.cwd());

type ScriptArgs = {
  tenantId: string | null;
  from: string | null;
  to: string | null;
  pageSize: number;
  output: string | null;
  type: string | null;
  action: string;
};

type AuditLogResponse = {
  data?: LightspeedAuditLogEvent[];
};

function parseArgs(argv: string[]): ScriptArgs {
  let tenantId: string | null = null;
  let from: string | null = null;
  let to: string | null = null;
  let pageSize = 100;
  let output: string | null = null;
  let type: string | null = null;
  let action = "delete";

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--tenant" && argv[index + 1]) {
      tenantId = argv[index + 1];
      index += 1;
      continue;
    }
    if (arg === "--from" && argv[index + 1]) {
      from = argv[index + 1];
      index += 1;
      continue;
    }
    if (arg === "--to" && argv[index + 1]) {
      to = argv[index + 1];
      index += 1;
      continue;
    }
    if (arg === "--page-size" && argv[index + 1]) {
      const parsed = Number.parseInt(argv[index + 1], 10);
      if (Number.isFinite(parsed) && parsed > 0 && parsed <= 100) {
        pageSize = parsed;
      }
      index += 1;
      continue;
    }
    if (arg === "--output" && argv[index + 1]) {
      output = argv[index + 1];
      index += 1;
      continue;
    }
    if (arg === "--type" && argv[index + 1]) {
      type = argv[index + 1];
      index += 1;
      continue;
    }
    if (arg === "--action" && argv[index + 1]) {
      action = argv[index + 1];
      index += 1;
    }
  }

  return {
    tenantId,
    from,
    to,
    pageSize,
    output,
    type,
    action,
  };
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

async function resolveLightspeedConnection(tenantId: string) {
  const { env } = await import("@/config/env");
  const { createSupabaseAdminClient } = await import("@/lib/supabase/service-role");
  const { LightspeedSettingsRepository } = await import(
    "@/repositories/lightspeed-settings-repo"
  );

  const supabase = createSupabaseAdminClient();
  const settingsRepo = new LightspeedSettingsRepository(supabase);
  const connection = await settingsRepo.getConnectionByTenant(tenantId);

  const domainPrefix =
    process.env.LIGHTSPEED_AUDIT_DOMAIN_PREFIX?.trim() ||
    connection.domainPrefix?.trim() ||
    env.LIGHTSPEED_DOMAIN_PREFIX.trim() ||
    null;
  const accessToken =
    process.env.LIGHTSPEED_AUDIT_ACCESS_TOKEN?.trim() ||
    connection.accessToken?.trim() ||
    env.LIGHTSPEED_ACCESS_TOKEN.trim() ||
    null;

  if (!domainPrefix || !accessToken) {
    throw new Error(
      "Lightspeed audit credentials are missing. Set the tenant connection, LIGHTSPEED_* env vars, or LIGHTSPEED_AUDIT_* overrides.",
    );
  }

  return { domainPrefix, accessToken };
}

function isProductAuditEvent(event: LightspeedAuditLogEvent) {
  return (event.type?.toLowerCase() ?? "").includes("product");
}

function sanitizeTimestamp(input: string) {
  return input.replace(/[:]/g, "-");
}

async function fetchAuditPage(input: {
  domainPrefix: string;
  accessToken: string;
  from: string;
  to: string;
  pageSize: number;
  offset: number;
  type: string | null;
}) {
  const query = new URLSearchParams({
    from: input.from,
    to: input.to,
    page_size: String(input.pageSize),
    offset: String(input.offset),
    order: "asc",
  });

  if (input.type?.trim()) {
    query.set("type", input.type.trim());
  }

  const response = await fetch(
    `https://${input.domainPrefix}.retail.lightspeed.app/api/2026-04/auditlog_events?${query.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${input.accessToken}`,
        Accept: "application/json",
      },
    },
  );

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `Lightspeed audit request failed (${response.status})${body ? `: ${body}` : ""}`,
    );
  }

  return (await response.json()) as AuditLogResponse;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (!args.from || !args.to) {
    throw new Error(
      "Missing required range. Usage: npm run recover:lightspeed-deleted-products -- --from <iso> --to <iso> [--tenant <id>]",
    );
  }

  const tenantId = await resolveTenantId(args.tenantId);
  if (!tenantId) {
    throw new Error("Unable to determine tenant id. Pass --tenant <id>.");
  }

  const connection = await resolveLightspeedConnection(tenantId);
  const allEvents: LightspeedAuditLogEvent[] = [];
  let offset = 0;

  while (true) {
    const page = await fetchAuditPage({
      ...connection,
      from: args.from,
      to: args.to,
      pageSize: args.pageSize,
      offset,
      type: args.type,
    });
    const events = Array.isArray(page.data) ? page.data : [];
    allEvents.push(...events);

    console.info(
      `[fetch] offset=${offset} pageSize=${args.pageSize} fetched=${events.length}`,
    );

    if (events.length < args.pageSize) {
      break;
    }

    offset += args.pageSize;
  }

  const filteredEvents = allEvents.filter((event) => {
    const actionMatches =
      args.action === "all" || (event.action?.toLowerCase() ?? "") === args.action;
    return actionMatches && isProductAuditEvent(event);
  });
  const records = filteredEvents.map((event) => extractDeletedProductRecord(event));

  const outputBase =
    args.output?.trim() ||
    path.join(
      process.cwd(),
      "tmp",
      `lightspeed-deleted-products-${sanitizeTimestamp(args.from)}-${sanitizeTimestamp(args.to)}`,
    );
  const outputDir = path.dirname(outputBase);
  await mkdir(outputDir, { recursive: true });

  const jsonPath = outputBase.endsWith(".json") ? outputBase : `${outputBase}.json`;
  const csvPath = outputBase.endsWith(".csv") ? outputBase : `${outputBase}.csv`;

  await writeFile(
    jsonPath,
    `${JSON.stringify(
      {
        tenantId,
        from: args.from,
        to: args.to,
        queryType: args.type,
        action: args.action,
        totalFetched: allEvents.length,
        matchingProductEvents: filteredEvents.length,
        records,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
  await writeFile(csvPath, `${formatDeletedProductRecordsAsCsv(records)}\n`, "utf8");

  console.info("");
  console.info(
    JSON.stringify(
      {
        tenantId,
        from: args.from,
        to: args.to,
        totalFetched: allEvents.length,
        matchingProductEvents: filteredEvents.length,
        jsonPath,
        csvPath,
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
