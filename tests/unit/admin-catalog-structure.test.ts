import fs from "node:fs";
import path from "node:path";

describe("admin catalog structure", () => {
  it("delegates catalog data loading and persistence orchestration to a focused hook", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/modules/catalog/presentation/admin/catalog/AdminCatalogScreen.tsx"),
      "utf8",
    );

    expect(source).toContain(
      "@/modules/catalog/presentation/admin/catalog/useAdminCatalogData",
    );
    expect(source).toContain("useAdminCatalogData()");
  });

  it("delegates catalog mutation workflows to a focused hook", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/modules/catalog/presentation/admin/catalog/AdminCatalogScreen.tsx"),
      "utf8",
    );

    expect(source).toContain(
      "@/modules/catalog/presentation/admin/catalog/useAdminCatalogMutations",
    );
    expect(source).toContain("useAdminCatalogMutations({");
  });

  it("delegates catalog derived filtering and lookup state to a focused hook", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/modules/catalog/presentation/admin/catalog/AdminCatalogScreen.tsx"),
      "utf8",
    );

    expect(source).toContain(
      "@/modules/catalog/presentation/admin/catalog/useAdminCatalogDerivedState",
    );
    expect(source).toContain("useAdminCatalogDerivedState({");
  });
});
