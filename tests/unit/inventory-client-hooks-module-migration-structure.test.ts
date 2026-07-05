import fs from "node:fs";
import path from "node:path";

const read = (relativePath: string) =>
  fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");

describe("inventory client hooks module migration structure", () => {
  it("makes the inventory controller-adjacent hooks module-owned", () => {
    const modulePaths = [
      "src/modules/catalog/presentation/admin/inventory/useInventoryClientData.ts",
      "src/modules/catalog/presentation/admin/inventory/useInventoryClientEffects.ts",
      "src/modules/catalog/presentation/admin/inventory/useInventoryClientHandlers.ts",
      "src/modules/catalog/presentation/admin/inventory/useInventoryClientMutations.ts",
      "src/modules/catalog/presentation/admin/inventory/useInventoryClientState.ts",
    ];

    for (const modulePath of modulePaths) {
      expect(read(modulePath)).toContain("export ");
    }
  });

  it("removes legacy inventory hook duplicate files after module migration", () => {
    const legacyPaths = [
      "src/components/admin/inventory/useInventoryClientData.ts",
      "src/components/admin/inventory/useInventoryClientEffects.ts",
      "src/components/admin/inventory/useInventoryClientHandlers.ts",
      "src/components/admin/inventory/useInventoryClientMutations.ts",
      "src/components/admin/inventory/useInventoryClientState.ts",
    ];

    for (const legacyPath of legacyPaths) {
      expect(fs.existsSync(path.join(process.cwd(), legacyPath))).toBe(false);
    }
  });
});
