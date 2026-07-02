import fs from "node:fs";
import path from "node:path";

describe("pickup orders table structure", () => {
  it("delegates pickup order row and item display helpers to a focused view module", () => {
    const tableSource = fs.readFileSync(
      path.join(process.cwd(), "src/components/admin/pickups/PickupOrdersTable.tsx"),
      "utf8",
    );
    const panelSource = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/components/admin/pickups/PickupOrderExpansionPanels.tsx",
      ),
      "utf8",
    );

    expect(tableSource).toContain("@/components/admin/pickups/pickupOrdersTableView");
    expect(tableSource).toContain("buildPickupOrderRowModel(");
    expect(panelSource).toContain("buildPickupOrderItemModel(");
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
