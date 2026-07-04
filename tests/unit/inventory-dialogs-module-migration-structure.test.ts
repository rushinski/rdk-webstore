import fs from "node:fs";
import path from "node:path";

const read = (relativePath: string) =>
  fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");

describe("inventory dialogs module migration structure", () => {
  it("makes the inventory dialogs and product-details stack module-owned", () => {
    const modulePaths = [
      "src/modules/catalog/presentation/admin/inventory/InventoryDialogs.tsx",
      "src/modules/catalog/presentation/admin/inventory/InventoryDeleteDialogs.tsx",
      "src/modules/catalog/presentation/admin/inventory/InventoryArchiveDialog.tsx",
      "src/modules/catalog/presentation/admin/inventory/InventoryRestoreDialog.tsx",
      "src/modules/catalog/presentation/admin/inventory/InventoryProductDetailsModal.tsx",
      "src/modules/catalog/presentation/admin/inventory/inventoryProductDetailsView.ts",
      "src/modules/catalog/presentation/admin/inventory/InventoryProductImageGallery.tsx",
      "src/modules/catalog/presentation/admin/inventory/InventoryProductMetadataPanel.tsx",
    ];

    for (const modulePath of modulePaths) {
      expect(read(modulePath)).toContain("export ");
    }
  });

  it("keeps legacy inventory dialog and details files as thin shims", () => {
    const legacyPaths = [
      "src/components/admin/inventory/InventoryDialogs.tsx",
      "src/components/admin/inventory/InventoryDeleteDialogs.tsx",
      "src/components/admin/inventory/InventoryArchiveDialog.tsx",
      "src/components/admin/inventory/InventoryRestoreDialog.tsx",
      "src/components/admin/inventory/InventoryProductDetailsModal.tsx",
      "src/components/admin/inventory/inventoryProductDetailsView.ts",
      "src/components/admin/inventory/InventoryProductImageGallery.tsx",
      "src/components/admin/inventory/InventoryProductMetadataPanel.tsx",
    ];

    for (const legacyPath of legacyPaths) {
      expect(read(legacyPath)).toContain(
        "@/modules/catalog/presentation/admin/inventory/",
      );
    }
  });
});
