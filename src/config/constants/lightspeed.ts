export const LIGHTSPEED_CONDITION_MAP = {
  new: "new",
  used: "preowned",
} as const;

export const LIGHTSPEED_SYNC_SOURCE_OF_TRUTH = [
  "lightspeed_inventory",
  "website_inventory",
] as const;
