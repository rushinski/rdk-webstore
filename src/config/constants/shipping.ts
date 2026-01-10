export const SHIPPO_TRACKING_STATUS_MAP: Record<string, string | null> = {
  PRE_TRANSIT: null,
  UNKNOWN: null,

  TRANSIT: "shipped",
  IN_TRANSIT: "shipped",
  OUT_FOR_DELIVERY: "shipped",
  AVAILABLE_FOR_PICKUP: "shipped",

  DELIVERED: "delivered",

  RETURNED: null,
  FAILURE: null,
  CANCELLED: null,
  ERROR: null,
};
