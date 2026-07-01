import fs from "node:fs";
import path from "node:path";

describe("shipping orders table structure", () => {
  it("delegates shipping order row and item display helpers to a focused view module", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/components/admin/shipping/ShippingOrdersTable.tsx"),
      "utf8",
    );

    expect(source).toContain("@/components/admin/shipping/shippingOrdersTableView");
    expect(source).toContain("buildShippingOrderRowModel(");
    expect(source).toContain("buildShippingActionNode(");
  });

  it("delegates expanded shipping item and mobile detail panels to a focused component", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/components/admin/shipping/ShippingOrdersTable.tsx"),
      "utf8",
    );

    expect(source).toContain("@/components/admin/shipping/ShippingOrderExpansionPanels");
    expect(source).toContain("<ShippingOrderExpansionPanels");
  });
});
