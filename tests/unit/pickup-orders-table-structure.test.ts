import fs from "node:fs";
import path from "node:path";

describe("pickup orders table structure", () => {
  it("delegates pickup order row and item display helpers to a focused view module", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/components/admin/pickups/PickupOrdersTable.tsx"),
      "utf8",
    );

    expect(source).toContain("@/components/admin/pickups/pickupOrdersTableView");
    expect(source).toContain("buildPickupOrderRowModel(");
    expect(source).toContain("buildPickupOrderItemModel(");
  });

  it("delegates expanded pickup item and mobile detail panels to a focused component", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/components/admin/pickups/PickupOrdersTable.tsx"),
      "utf8",
    );

    expect(source).toContain("@/components/admin/pickups/PickupOrderExpansionPanels");
    expect(source).toContain("<PickupOrderExpansionPanels");
  });
});
