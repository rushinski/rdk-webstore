import fs from "node:fs";
import path from "node:path";

describe("featured items screen structure", () => {
  it("delegates featured item loading, search, reorder, and mutation workflows to a focused hook", () => {
    const source = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/components/admin/featured-items/FeaturedItemsScreen.tsx",
      ),
      "utf8",
    );

    expect(source).toContain("@/components/admin/featured-items/useFeaturedItemsScreen");
    expect(source).toContain("useFeaturedItemsScreen()");
  });

  it("delegates featured-item pricing helpers and feedback rendering to focused modules", () => {
    const source = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/components/admin/featured-items/FeaturedItemsScreen.tsx",
      ),
      "utf8",
    );
    const viewSource = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/components/admin/featured-items/featuredItemsView.ts",
      ),
      "utf8",
    );

    expect(source).toContain("@/components/admin/featured-items/featuredItemsView");
    expect(source).toContain("@/components/admin/featured-items/FeaturedItemsFeedback");
    expect(viewSource).toContain("formatFeaturedItemPrice");
    expect(viewSource).toContain("getFeaturedItemMinPrice");
  });
});
