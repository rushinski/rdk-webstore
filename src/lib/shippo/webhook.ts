import { shippoTrackingUpdateSchema } from "@/lib/validation/webhooks";

type ShippoTrackingEventType = "track_updated" | "transaction_updated";

export type ShippoTrackingUpdate = {
  event: ShippoTrackingEventType;
  trackingNumber: string;
  statusRaw: string;
  carrier: string | null;
  trackingUrl: string | null;
};

const asRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
};

const readString = (value: unknown): string | undefined => {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const readStatus = (value: unknown): string | undefined => {
  const directValue = readString(value);
  if (directValue) {
    return directValue;
  }

  const objectValue = asRecord(value);
  if (!objectValue) {
    return undefined;
  }

  return readString(objectValue.status);
};

export function extractShippoTrackingUpdate(payload: unknown): ShippoTrackingUpdate | null {
  const parsed = shippoTrackingUpdateSchema.safeParse(payload);
  if (!parsed.success) {
    return null;
  }

  const data = parsed.data.data ?? {};
  const trackingNumber =
    readString(data.tracking_number) ?? readString(data.trackingNumber);
  const statusRaw = readStatus(data.tracking_status) ?? readStatus(data.trackingStatus);

  if (!trackingNumber || !statusRaw) {
    return null;
  }

  return {
    event: parsed.data.event,
    trackingNumber,
    statusRaw,
    carrier: readString(data.carrier) ?? null,
    trackingUrl:
      readString(data.tracking_url_provider) ?? readString(data.trackingUrlProvider) ?? null,
  };
}
