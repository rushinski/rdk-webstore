import fs from "node:fs";
import path from "node:path";

const read = (relativePath: string) =>
  fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");

describe("admin catalog module migration structure", () => {
  it("makes the catalog screen shell and orchestration hooks module-owned", () => {
    const modulePaths = [
      "src/modules/catalog/presentation/admin/catalog/AdminCatalogScreen.tsx",
      "src/modules/catalog/presentation/admin/catalog/CatalogInfoKey.tsx",
      "src/modules/catalog/presentation/admin/catalog/CatalogTabContent.tsx",
      "src/modules/catalog/presentation/admin/catalog/catalogConfig.ts",
      "src/modules/catalog/presentation/admin/catalog/catalogEditState.ts",
      "src/modules/catalog/presentation/admin/catalog/types.ts",
      "src/modules/catalog/presentation/admin/catalog/useAdminCatalogData.ts",
      "src/modules/catalog/presentation/admin/catalog/useAdminCatalogMutations.ts",
      "src/modules/catalog/presentation/admin/catalog/useAdminCatalogDerivedState.ts",
      "src/modules/catalog/presentation/admin/catalog/useAdminCatalogScreenState.ts",
      "src/modules/catalog/presentation/admin/catalog/components/CatalogToolbar.tsx",
      "src/modules/catalog/presentation/admin/catalog/components/TagModals.tsx",
    ];

    for (const modulePath of modulePaths) {
      expect(read(modulePath)).toContain("export ");
    }
  });

  it("keeps the legacy catalog shell and orchestration hooks as thin shims", () => {
    const legacyPaths = [
      "src/components/admin/catalog/AdminCatalogScreen.tsx",
      "src/components/admin/catalog/CatalogInfoKey.tsx",
      "src/components/admin/catalog/CatalogTabContent.tsx",
      "src/components/admin/catalog/catalogConfig.ts",
      "src/components/admin/catalog/catalogEditState.ts",
      "src/components/admin/catalog/types.ts",
      "src/components/admin/catalog/useAdminCatalogData.ts",
      "src/components/admin/catalog/useAdminCatalogMutations.ts",
      "src/components/admin/catalog/useAdminCatalogDerivedState.ts",
      "src/components/admin/catalog/useAdminCatalogScreenState.ts",
      "src/components/admin/catalog/components/CatalogToolbar.tsx",
      "src/components/admin/catalog/components/TagModals.tsx",
    ];

    for (const legacyPath of legacyPaths) {
      expect(read(legacyPath)).toContain(
        "@/modules/catalog/presentation/admin/catalog/",
      );
    }
  });
});
