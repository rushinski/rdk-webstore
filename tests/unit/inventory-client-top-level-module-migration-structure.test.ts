import fs from "node:fs";
import path from "node:path";

const read = (relativePath: string) =>
  fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");

describe("inventory client top-level module migration structure", () => {
  it("makes the inventory client shell and controller layer module-owned", () => {
    const modulePaths = [
      "src/modules/catalog/presentation/admin/inventory/InventoryClient.tsx",
      "src/modules/catalog/presentation/admin/inventory/useInventoryClientController.ts",
      "src/modules/catalog/presentation/admin/inventory/InventoryClientContent.tsx",
      "src/modules/catalog/presentation/admin/inventory/inventoryClientSurface.ts",
      "src/modules/catalog/presentation/admin/inventory/inventoryClientView.ts",
    ];

    for (const modulePath of modulePaths) {
      expect(read(modulePath)).toContain("export ");
    }
  });

  it("removes legacy inventory top-level duplicate files after module migration", () => {
    const legacyPaths = [
      "src/components/admin/inventory/InventoryClient.tsx",
      "src/components/admin/inventory/useInventoryClientController.ts",
      "src/components/admin/inventory/InventoryClientContent.tsx",
      "src/components/admin/inventory/inventoryClientSurface.ts",
      "src/components/admin/inventory/inventoryClientView.ts",
    ];

    for (const legacyPath of legacyPaths) {
      expect(fs.existsSync(path.join(process.cwd(), legacyPath))).toBe(false);
    }
  });
});
