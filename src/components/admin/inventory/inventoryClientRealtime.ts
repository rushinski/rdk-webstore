export function getInventoryRealtimeChannelName() {
  return "admin-inventory";
}

export function getInventoryRealtimeTables() {
  return ["product_variants", "products"];
}

export function shouldClearInventoryRefreshTimer(timerId: number | null) {
  return timerId !== null;
}
