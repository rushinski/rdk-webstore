import fs from "node:fs";
import path from "node:path";

describe("pickup orders table structure", () => {
  it("delegates pickup order row and item display helpers to a focused view module", () => {
    const rowSource = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/modules/orders/presentation/admin/pickups/PickupOrdersTableRow.tsx",
      ),
      "utf8",
    );
    const desktopSource = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/modules/orders/presentation/admin/pickups/PickupExpandedItemsRow.tsx",
      ),
      "utf8",
    );
    const mobileSource = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/modules/orders/presentation/admin/pickups/PickupMobileDetailsRow.tsx",
      ),
      "utf8",
    );

    expect(rowSource).toContain("@/modules/orders/presentation/admin/pickups/pickupOrdersTableView");
    expect(rowSource).toContain("buildPickupOrderRowModel(");
    expect(desktopSource).toContain("buildPickupOrderItemModel(");
    expect(mobileSource).toContain("buildPickupOrderItemModel(");
  });

  it("delegates expanded pickup item and mobile detail panels to a focused component", () => {
    const source = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/modules/orders/presentation/admin/pickups/PickupOrdersTableRow.tsx",
      ),
      "utf8",
    );

    expect(source).toContain("@/modules/orders/presentation/admin/pickups/PickupOrderExpansionPanels");
    expect(source).toContain("<PickupOrderExpansionPanels");
  });

  it("delegates pickup table header and row mounting to focused child components", () => {
    const source = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/modules/orders/presentation/admin/pickups/PickupOrdersTable.tsx",
      ),
      "utf8",
    );

    expect(source).toContain("@/modules/orders/presentation/admin/pickups/PickupOrdersTableHeader");
    expect(source).toContain("@/modules/orders/presentation/admin/pickups/PickupOrdersTableRow");
    expect(source).toContain("@/modules/orders/presentation/admin/pickups/pickupOrdersTableTypes");
  });
});
