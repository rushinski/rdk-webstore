import fs from "node:fs";
import path from "node:path";

const read = (relativePath: string) =>
  fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");

describe("featured items module migration structure", () => {
  it("makes the featured items screen shell, hook, and view helpers module-owned", () => {
    const modulePaths = [
      "src/modules/catalog/presentation/admin/featured-items/FeaturedItemsScreen.tsx",
      "src/modules/catalog/presentation/admin/featured-items/FeaturedItemsFeedback.tsx",
      "src/modules/catalog/presentation/admin/featured-items/FeaturedItemsList.tsx",
      "src/modules/catalog/presentation/admin/featured-items/FeaturedItemsSearchPanel.tsx",
      "src/modules/catalog/presentation/admin/featured-items/useFeaturedItemsScreen.ts",
      "src/modules/catalog/presentation/admin/featured-items/useFeaturedItemsSearch.ts",
      "src/modules/catalog/presentation/admin/featured-items/featuredItemsRequests.ts",
      "src/modules/catalog/presentation/admin/featured-items/featuredItemsStyles.ts",
      "src/modules/catalog/presentation/admin/featured-items/featuredItemsTypes.ts",
      "src/modules/catalog/presentation/admin/featured-items/featuredItemsView.ts",
    ];

    for (const modulePath of modulePaths) {
      expect(read(modulePath)).toContain("export ");
    }
  });

  it("removes the legacy featured items duplicate files after module migration", () => {
    const legacyPaths = [
      "src/components/admin/featured-items/FeaturedItemsScreen.tsx",
      "src/components/admin/featured-items/FeaturedItemsFeedback.tsx",
      "src/components/admin/featured-items/FeaturedItemsList.tsx",
      "src/components/admin/featured-items/FeaturedItemsSearchPanel.tsx",
      "src/components/admin/featured-items/useFeaturedItemsScreen.ts",
      "src/components/admin/featured-items/useFeaturedItemsSearch.ts",
      "src/components/admin/featured-items/featuredItemsRequests.ts",
      "src/components/admin/featured-items/featuredItemsStyles.ts",
      "src/components/admin/featured-items/featuredItemsTypes.ts",
      "src/components/admin/featured-items/featuredItemsView.ts",
    ];

    for (const legacyPath of legacyPaths) {
      expect(fs.existsSync(path.join(process.cwd(), legacyPath))).toBe(false);
    }
  });
});
