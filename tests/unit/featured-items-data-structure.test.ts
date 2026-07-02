import fs from "node:fs";
import path from "node:path";

describe("featured items data structure", () => {
  it("delegates featured item fetch and mutation requests to a focused request module", () => {
    const source = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/components/admin/featured-items/useFeaturedItemsScreen.ts",
      ),
      "utf8",
    );

    expect(source).toContain("@/components/admin/featured-items/featuredItemsRequests");
    expect(source).toContain("loadFeaturedItemsRequest()");
    expect(source).toContain("searchFeaturedItemProductsRequest(");
    expect(source).toContain("addFeaturedItemRequest(");
    expect(source).toContain("removeFeaturedItemRequest(");
    expect(source).toContain("reorderFeaturedItemsRequest(");
  });
});
