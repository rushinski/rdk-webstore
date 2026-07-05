import fs from "node:fs";
import path from "node:path";

describe("featured items screen structure", () => {
  it("routes the featured items page through the module boundary", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "app/admin/featured-items/page.tsx"),
      "utf8",
    );

    expect(source).toContain("@/modules/catalog/presentation/admin/featured-items");
    expect(source).toContain("<FeaturedItemsScreen />");
  });

  it("delegates featured item loading, search, reorder, and mutation workflows to a focused hook", () => {
    const source = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/modules/catalog/presentation/admin/featured-items/FeaturedItemsScreen.tsx",
      ),
      "utf8",
    );

    expect(source).toContain(
      "@/modules/catalog/presentation/admin/featured-items/useFeaturedItemsScreen",
    );
    expect(source).toContain("useFeaturedItemsScreen()");
  });

  it("delegates featured-item pricing helpers and feedback rendering to focused modules", () => {
    const source = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/modules/catalog/presentation/admin/featured-items/FeaturedItemsScreen.tsx",
      ),
      "utf8",
    );
    const viewSource = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/modules/catalog/presentation/admin/featured-items/featuredItemsView.ts",
      ),
      "utf8",
    );

    expect(source).toContain(
      "@/modules/catalog/presentation/admin/featured-items/featuredItemsView",
    );
    expect(source).toContain(
      "@/modules/catalog/presentation/admin/featured-items/FeaturedItemsFeedback",
    );
    expect(viewSource).toContain("formatFeaturedItemPrice");
    expect(viewSource).toContain("getFeaturedItemMinPrice");
  });
});
