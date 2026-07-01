import fs from "node:fs";
import path from "node:path";

describe("frontend structure standards", () => {
  it("avoids src-crossing relative imports from app routes", () => {
    const shippingPage = fs.readFileSync(
      path.join(process.cwd(), "app/admin/shipping/page.tsx"),
      "utf8",
    );

    expect(shippingPage).not.toMatch(/\.\.\/\.\.\/\.\.\/src\//);
  });

  it("keeps storefront wrappers from re-exporting legacy store components", () => {
    const catalogGrid = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/components/storefront/catalog/StorefrontProductGrid.tsx",
      ),
      "utf8",
    );

    expect(catalogGrid).not.toContain("CatalogProductGrid");
    expect(catalogGrid).toContain("StorefrontProductGrid");
  });
});
