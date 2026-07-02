import fs from "node:fs";
import path from "node:path";

describe("shipping order expansion panels structure", () => {
  it("delegates desktop item rows and mobile detail rows to focused child components", () => {
    const source = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/components/admin/shipping/ShippingOrderExpansionPanels.tsx",
      ),
      "utf8",
    );

    expect(source).toContain("@/components/admin/shipping/ShippingExpandedItemsRow");
    expect(source).toContain("@/components/admin/shipping/ShippingMobileDetailsRow");
    expect(source).toContain("@/components/admin/shipping/shippingOrderExpansionTypes");
  });

  it("keeps shipping item formatting in the shared shipping orders table view helper", () => {
    const desktopSource = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/components/admin/shipping/ShippingExpandedItemsRow.tsx",
      ),
      "utf8",
    );
    const mobileSource = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/components/admin/shipping/ShippingMobileDetailsRow.tsx",
      ),
      "utf8",
    );

    expect(desktopSource).toContain("buildShippingOrderItemModel(");
    expect(mobileSource).toContain("buildShippingOrderItemModel(");
  });
});
