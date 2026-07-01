import fs from "node:fs";
import path from "node:path";

describe("inventory product list structure", () => {
  it("delegates inventory product and variant display helpers to a focused view module", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/components/admin/inventory/InventoryProductList.tsx"),
      "utf8",
    );

    expect(source).toContain("@/components/admin/inventory/inventoryProductListView");
    expect(source).toContain("buildInventoryProductCardModel(");
    expect(source).toContain("formatInventoryVariantMoney(");
  });
});
