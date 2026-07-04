import fs from "node:fs";
import path from "node:path";

const read = (relativePath: string) =>
  fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");

describe("inventory toolbar module migration structure", () => {
  it("makes the inventory toolbar and pagination stack module-owned", () => {
    const modulePaths = [
      "src/modules/catalog/presentation/admin/inventory/InventoryToolbar.tsx",
      "src/modules/catalog/presentation/admin/inventory/InventoryFilterControls.tsx",
      "src/modules/catalog/presentation/admin/inventory/InventoryBulkActionsBar.tsx",
      "src/modules/catalog/presentation/admin/inventory/InventoryStockStatusTabs.tsx",
      "src/modules/catalog/presentation/admin/inventory/InventoryPagination.tsx",
    ];

    for (const modulePath of modulePaths) {
      expect(read(modulePath)).toContain("export ");
    }
  });

  it("keeps legacy inventory toolbar files as thin shims", () => {
    const legacyPaths = [
      "src/components/admin/inventory/InventoryToolbar.tsx",
      "src/components/admin/inventory/InventoryFilterControls.tsx",
      "src/components/admin/inventory/InventoryBulkActionsBar.tsx",
      "src/components/admin/inventory/InventoryStockStatusTabs.tsx",
      "src/components/admin/inventory/InventoryPagination.tsx",
    ];

    for (const legacyPath of legacyPaths) {
      expect(read(legacyPath)).toContain(
        "@/modules/catalog/presentation/admin/inventory/",
      );
    }
  });
});
