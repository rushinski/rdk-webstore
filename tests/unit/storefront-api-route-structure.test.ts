import fs from "node:fs";
import path from "node:path";

const read = (relativePath: string) =>
  fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");

describe("storefront api route structure", () => {
  it("routes store catalog apis through the storefront module infrastructure boundary", () => {
    const routePaths = [
      "app/api/store/products/route.ts",
      "app/api/store/products/[id]/route.ts",
      "app/api/store/filters/route.ts",
      "app/api/store/catalog/brands/route.ts",
      "app/api/store/catalog/brand-groups/route.ts",
    ];

    for (const routePath of routePaths) {
      const source = read(routePath);
      expect(source).toContain("@/modules/storefront/infrastructure/storefront-data");
      expect(source).not.toContain("@/services/storefront-service");
    }
  });
});
