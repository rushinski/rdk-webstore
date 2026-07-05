import fs from "node:fs";
import path from "node:path";

describe("storefront route structure", () => {
  it("routes the home page through the storefront module boundary", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "app/page.tsx"), "utf8");

    expect(source).toContain("@/modules/storefront");
    expect(source).toContain("<HomePageContent />");
  });

  it("routes the store catalog page through the storefront module boundary", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "app/store/page.tsx"), "utf8");

    expect(source).toContain("@/modules/storefront");
    expect(source).toContain("<StoreCatalogPageContent");
  });

  it("routes the store product detail page through the storefront module boundary", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "app/store/[productId]/page.tsx"),
      "utf8",
    );

    expect(source).toContain("@/modules/storefront");
    expect(source).toContain("buildStoreProductMetadata");
    expect(source).toContain("<StoreProductDetailPageContent");
  });

  it("routes the brands page through the storefront module boundary", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "app/brands/page.tsx"), "utf8");

    expect(source).toContain("@/modules/storefront");
    expect(source).toContain("<BrandsPageContent");
  });
});
