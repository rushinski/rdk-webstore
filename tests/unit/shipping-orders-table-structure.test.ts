import fs from "node:fs";
import path from "node:path";

describe("shipping orders table structure", () => {
  it("delegates shipping order row and item display helpers to a focused view module", () => {
    const rowSource = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/modules/orders/presentation/admin/shipping/ShippingOrdersTableRow.tsx",
      ),
      "utf8",
    );

    expect(rowSource).toContain(
      "@/modules/orders/presentation/admin/shipping/shippingOrdersTableView",
    );
    expect(rowSource).toContain("buildShippingOrderRowModel(");
    expect(rowSource).toContain("buildShippingActionNode(");
  });

  it("delegates expanded shipping item and mobile detail panels to a focused component", () => {
    const source = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/modules/orders/presentation/admin/shipping/ShippingOrdersTableRow.tsx",
      ),
      "utf8",
    );

    expect(source).toContain(
      "@/modules/orders/presentation/admin/shipping/ShippingOrderExpansionPanels",
    );
    expect(source).toContain("<ShippingOrderExpansionPanels");
  });

  it("delegates table header and row mounting to focused child components", () => {
    const source = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/modules/orders/presentation/admin/shipping/ShippingOrdersTable.tsx",
      ),
      "utf8",
    );

    expect(source).toContain(
      "@/modules/orders/presentation/admin/shipping/ShippingOrdersTableHeader",
    );
    expect(source).toContain(
      "@/modules/orders/presentation/admin/shipping/ShippingOrdersTableRow",
    );
    expect(source).toContain(
      "@/modules/orders/presentation/admin/shipping/shippingOrdersTableTypes",
    );
  });
});
