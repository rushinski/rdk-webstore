type AuditLogPayload = Record<string, unknown> | Array<Record<string, unknown>> | null;

export type LightspeedAuditLogEvent = {
  id: string;
  entity_id: string | null;
  action: string | null;
  type: string | null;
  occurred_at: string | null;
  created_at: string | null;
  user_id?: string | null;
  ip_address?: string | null;
  user_agent?: string | null;
  data?: AuditLogPayload;
  old_data?: AuditLogPayload;
};

export type DeletedProductRecord = {
  eventId: string;
  entityId: string | null;
  action: string | null;
  type: string | null;
  occurredAt: string | null;
  createdAt: string | null;
  userId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  name: string | null;
  sku: string | null;
  variantName: string | null;
  handle: string | null;
  source: string | null;
  rawData: AuditLogPayload;
  rawOldData: AuditLogPayload;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function firstRecord(value: AuditLogPayload | undefined): Record<string, unknown> | null {
  if (Array.isArray(value)) {
    return value.find(isRecord) ?? null;
  }

  return isRecord(value) ? value : null;
}

function readString(
  primary: Record<string, unknown> | null,
  fallback: Record<string, unknown> | null,
  key: string,
) {
  const primaryValue = primary?.[key];
  if (typeof primaryValue === "string" && primaryValue.trim()) {
    return primaryValue.trim();
  }

  const fallbackValue = fallback?.[key];
  if (typeof fallbackValue === "string" && fallbackValue.trim()) {
    return fallbackValue.trim();
  }

  return null;
}

export function extractDeletedProductRecord(
  event: LightspeedAuditLogEvent,
): DeletedProductRecord {
  const oldRecord = firstRecord(event.old_data);
  const dataRecord = firstRecord(event.data);

  return {
    eventId: event.id,
    entityId: event.entity_id ?? null,
    action: event.action ?? null,
    type: event.type ?? null,
    occurredAt: event.occurred_at ?? null,
    createdAt: event.created_at ?? null,
    userId: event.user_id ?? null,
    ipAddress: event.ip_address ?? null,
    userAgent: event.user_agent ?? null,
    name: readString(oldRecord, dataRecord, "name"),
    sku: readString(oldRecord, dataRecord, "sku"),
    variantName: readString(oldRecord, dataRecord, "variant_name"),
    handle: readString(oldRecord, dataRecord, "handle"),
    source: readString(oldRecord, dataRecord, "source"),
    rawData: event.data ?? null,
    rawOldData: event.old_data ?? null,
  };
}

function escapeCsv(value: unknown) {
  const text =
    typeof value === "string"
      ? value
      : value === null || value === undefined
        ? ""
        : JSON.stringify(value);
  return `"${text.replace(/"/g, '""')}"`;
}

export function formatDeletedProductRecordsAsCsv(records: DeletedProductRecord[]) {
  const columns = [
    "eventId",
    "entityId",
    "action",
    "type",
    "occurredAt",
    "createdAt",
    "userId",
    "ipAddress",
    "userAgent",
    "name",
    "sku",
    "variantName",
    "handle",
    "source",
    "rawData",
    "rawOldData",
  ] as const;

  const header = columns.map((column) => escapeCsv(column)).join(",");
  const rows = records.map((record) =>
    columns.map((column) => escapeCsv(record[column])).join(","),
  );

  return [header, ...rows].join("\n");
}
