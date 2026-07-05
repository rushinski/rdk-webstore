import fs from "node:fs";
import path from "node:path";

describe("brands tab structure", () => {
  it("delegates brand row rendering to a focused component", () => {
    const source = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/modules/catalog/presentation/admin/catalog/components/BrandsTab.tsx",
      ),
      "utf8",
    );

    expect(source).toContain("CatalogBrandRow");
    expect(source).toContain("<CatalogBrandRow");
  });

  it("delegates expanded model list rendering to a focused component", () => {
    const source = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/modules/catalog/presentation/admin/catalog/components/CatalogBrandRow.tsx",
      ),
      "utf8",
    );

    expect(source).toContain("CatalogBrandModelsList");
    expect(source).toContain("<CatalogBrandModelsList");
  });
});
