import fs from "node:fs";
import path from "node:path";

describe("admin catalog screen structure", () => {
  it("routes the admin catalog page through the catalog module boundary", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "app/admin/catalog/page.tsx"),
      "utf8",
    );

    expect(source).toContain("@/modules/catalog/presentation/admin/catalog");
    expect(source).toContain("<AdminCatalogScreen />");
  });

  it("delegates tab-surface rendering and edit-draft bootstrap logic to focused catalog helpers", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/modules/catalog/presentation/admin/catalog/AdminCatalogScreen.tsx"),
      "utf8",
    );

    expect(source).toContain(
      "@/modules/catalog/presentation/admin/catalog/CatalogTabContent",
    );
    expect(source).toContain(
      "@/modules/catalog/presentation/admin/catalog/useAdminCatalogScreenState",
    );
    expect(source).toContain("useAdminCatalogScreenState({");
  });
});
