import {
  getInventoryRealtimeChannelName,
  getInventoryRealtimeTables,
  shouldClearInventoryRefreshTimer,
} from "@/components/admin/inventory/inventoryClientRealtime";

describe("inventoryClientRealtime", () => {
  it("exposes the realtime channel name", () => {
    expect(getInventoryRealtimeChannelName()).toBe("admin-inventory");
  });

  it("exposes subscribed inventory tables", () => {
    expect(getInventoryRealtimeTables()).toEqual(["product_variants", "products"]);
  });

  it("only clears the refresh timer when one exists", () => {
    expect(shouldClearInventoryRefreshTimer(null)).toBe(false);
    expect(shouldClearInventoryRefreshTimer(123)).toBe(true);
  });
});
