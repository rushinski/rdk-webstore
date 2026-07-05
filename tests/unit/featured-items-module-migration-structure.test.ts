import fs from "node:fs";
import path from "node:path";

const read = (relativePath: string) =>
  fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");

describe("featured items module migration structure", () => {
  it("makes the featured items screen shell, hook, and view helpers module-owned", () => {
    const modulePaths = [
      "src/modules/catalog/presentation/admin/featured-items/FeaturedItemsScreen.tsx",
      "src/modules/catalog/presentation/admin/featured-items/useFeaturedItemsScreen.ts",
      "src/modules/catalog/presentation/admin/featured-items/featuredItemsView.ts",
    ];

    for (const modulePath of modulePaths) {
      expect(read(modulePath)).toContain("export ");
    }
  });

  it("keeps the legacy featured items shell, hook, and view helpers as thin shims", () => {
    const legacyPaths = [
      "src/components/admin/featured-items/FeaturedItemsScreen.tsx",
      "src/components/admin/featured-items/useFeaturedItemsScreen.ts",
      "src/components/admin/featured-items/featuredItemsView.ts",
    ];

    for (const legacyPath of legacyPaths) {
      expect(read(legacyPath)).toContain(
        "@/modules/catalog/presentation/admin/featured-items/",
      );
    }
  });
});
