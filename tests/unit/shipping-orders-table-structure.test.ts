import fs from "node:fs";
import path from "node:path";

describe("shipping orders table structure", () => {
  it("delegates shipping order row and item display helpers to a focused view module", () => {
    const rowSource = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/components/admin/shipping/ShippingOrdersTableRow.tsx",
      ),
      "utf8",
    );

    expect(rowSource).toContain("@/components/admin/shipping/shippingOrdersTableView");
    expect(rowSource).toContain("buildShippingOrderRowModel(");
    expect(rowSource).toContain("buildShippingActionNode(");
  });

  it("delegates expanded shipping item and mobile detail panels to a focused component", () => {
    const source = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/components/admin/shipping/ShippingOrdersTableRow.tsx",
      ),
      "utf8",
    );

    expect(source).toContain("@/components/admin/shipping/ShippingOrderExpansionPanels");
    expect(source).toContain("<ShippingOrderExpansionPanels");
  });

  it("delegates table header and row mounting to focused child components", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/components/admin/shipping/ShippingOrdersTable.tsx"),
      "utf8",
    );

    expect(source).toContain("@/components/admin/shipping/ShippingOrdersTableHeader");
    expect(source).toContain("@/components/admin/shipping/ShippingOrdersTableRow");
    expect(source).toContain("@/components/admin/shipping/shippingOrdersTableTypes");
  });
});
