import fs from "node:fs";
import path from "node:path";

describe("featured items search structure", () => {
  it("delegates featured item search state and filtering to a focused hook", () => {
    const source = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/components/admin/featured-items/useFeaturedItemsScreen.ts",
      ),
      "utf8",
    );

    expect(source).toContain("@/components/admin/featured-items/useFeaturedItemsSearch");
    expect(source).toContain("useFeaturedItemsSearch({");
  });
});
