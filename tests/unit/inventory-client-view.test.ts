import {
  getInventoryExportFileName,
  getInventoryHeaderDescription,
} from "@/modules/catalog/presentation/admin/inventory/inventoryClientView";

describe("inventoryClientView", () => {
  it("builds the inventory header summary line", () => {
    expect(getInventoryHeaderDescription(12, 40, 125)).toBe(
      "12 unique SKUs · 40 total products · 125 total inventory units",
    );
  });

  it("builds a dated export filename", () => {
    expect(getInventoryExportFileName("2026-07-01T13:00:00.000Z")).toBe(
      "inventory-2026-07-01.csv",
    );
  });
});
