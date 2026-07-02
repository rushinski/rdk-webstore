import fs from "node:fs";
import path from "node:path";

describe("pickup orders table structure", () => {
  it("delegates pickup order row and item display helpers to a focused view module", () => {
    const rowSource = fs.readFileSync(
      path.join(process.cwd(), "src/components/admin/pickups/PickupOrdersTableRow.tsx"),
      "utf8",
    );
    const desktopSource = fs.readFileSync(
      path.join(process.cwd(), "src/components/admin/pickups/PickupExpandedItemsRow.tsx"),
      "utf8",
    );
    const mobileSource = fs.readFileSync(
      path.join(process.cwd(), "src/components/admin/pickups/PickupMobileDetailsRow.tsx"),
      "utf8",
    );

    expect(rowSource).toContain("@/components/admin/pickups/pickupOrdersTableView");
    expect(rowSource).toContain("buildPickupOrderRowModel(");
    expect(desktopSource).toContain("buildPickupOrderItemModel(");
    expect(mobileSource).toContain("buildPickupOrderItemModel(");
  });

  it("delegates expanded pickup item and mobile detail panels to a focused component", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/components/admin/pickups/PickupOrdersTableRow.tsx"),
      "utf8",
    );

    expect(source).toContain("@/components/admin/pickups/PickupOrderExpansionPanels");
    expect(source).toContain("<PickupOrderExpansionPanels");
  });

  it("delegates pickup table header and row mounting to focused child components", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/components/admin/pickups/PickupOrdersTable.tsx"),
      "utf8",
    );

    expect(source).toContain("@/components/admin/pickups/PickupOrdersTableHeader");
    expect(source).toContain("@/components/admin/pickups/PickupOrdersTableRow");
    expect(source).toContain("@/components/admin/pickups/pickupOrdersTableTypes");
  });
});
