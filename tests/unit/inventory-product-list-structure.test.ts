import fs from "node:fs";
import path from "node:path";

describe("inventory product list structure", () => {
  it("delegates inventory product and variant display helpers to a focused view module", () => {
    const source = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/modules/catalog/presentation/admin/inventory/InventoryProductList.tsx",
      ),
      "utf8",
    );

    expect(source).toContain(
      "@/modules/catalog/presentation/admin/inventory/InventoryProductTable",
    );
    expect(source).toContain(
      "@/modules/catalog/presentation/admin/inventory/InventoryProductMobileCards",
    );
  });

  it("delegates expanded inventory variant surfaces to a focused component", () => {
    const tableSource = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/modules/catalog/presentation/admin/inventory/InventoryProductTable.tsx",
      ),
      "utf8",
    );
    const mobileSource = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/modules/catalog/presentation/admin/inventory/InventoryProductMobileCards.tsx",
      ),
      "utf8",
    );
    const panelSource = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/modules/catalog/presentation/admin/inventory/InventoryProductVariantPanels.tsx",
      ),
      "utf8",
    );
    const rowSource = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/modules/catalog/presentation/admin/inventory/InventoryProductTableRow.tsx",
      ),
      "utf8",
    );

    expect(tableSource).toContain(
      "@/modules/catalog/presentation/admin/inventory/InventoryProductTableRow",
    );
    expect(rowSource).toContain(
      "@/modules/catalog/presentation/admin/inventory/InventoryProductVariantPanels",
    );
    expect(rowSource).toContain("buildInventoryProductCardModel(");
    expect(mobileSource).toContain(
      "@/modules/catalog/presentation/admin/inventory/InventoryProductVariantPanels",
    );
    expect(mobileSource).toContain("buildInventoryProductCardModel(");
    expect(panelSource).toContain("formatInventoryVariantMoney(");
  });

  it("shares the product list contract through a focused inventory list types module", () => {
    const listSource = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/modules/catalog/presentation/admin/inventory/InventoryProductList.tsx",
      ),
      "utf8",
    );
    const typesSource = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/modules/catalog/presentation/admin/inventory/inventoryProductListTypes.ts",
      ),
      "utf8",
    );

    expect(listSource).toContain(
      "@/modules/catalog/presentation/admin/inventory/inventoryProductListTypes",
    );
    expect(typesSource).toContain("export type InventoryProductListProps = {");
  });
});
