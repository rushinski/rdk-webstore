import fs from "node:fs";
import path from "node:path";

const read = (relativePath: string) =>
  fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");

describe("inventory product list module migration structure", () => {
  it("makes the inventory product list stack module-owned", () => {
    const modulePaths = [
      "src/modules/catalog/presentation/admin/inventory/InventoryProductList.tsx",
      "src/modules/catalog/presentation/admin/inventory/InventoryProductTable.tsx",
      "src/modules/catalog/presentation/admin/inventory/InventoryProductTableRow.tsx",
      "src/modules/catalog/presentation/admin/inventory/InventoryProductMobileCards.tsx",
      "src/modules/catalog/presentation/admin/inventory/InventoryProductVariantPanels.tsx",
      "src/modules/catalog/presentation/admin/inventory/inventoryProductListTypes.ts",
      "src/modules/catalog/presentation/admin/inventory/inventoryProductListView.ts",
    ];

    for (const modulePath of modulePaths) {
      expect(read(modulePath)).toContain("export ");
    }
  });

  it("removes legacy inventory product list duplicate files after module migration", () => {
    const legacyPaths = [
      "src/components/admin/inventory/InventoryProductList.tsx",
      "src/components/admin/inventory/InventoryProductTable.tsx",
      "src/components/admin/inventory/InventoryProductTableRow.tsx",
      "src/components/admin/inventory/InventoryProductMobileCards.tsx",
      "src/components/admin/inventory/InventoryProductVariantPanels.tsx",
      "src/components/admin/inventory/inventoryProductListTypes.ts",
      "src/components/admin/inventory/inventoryProductListView.ts",
    ];

    for (const legacyPath of legacyPaths) {
      expect(fs.existsSync(path.join(process.cwd(), legacyPath))).toBe(false);
    }
  });
});
