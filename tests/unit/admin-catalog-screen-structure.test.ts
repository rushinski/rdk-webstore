import fs from "node:fs";
import path from "node:path";

describe("admin catalog screen structure", () => {
  it("delegates tab-surface rendering and edit-draft bootstrap logic to focused catalog helpers", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/components/admin/catalog/AdminCatalogScreen.tsx"),
      "utf8",
    );

    expect(source).toContain("@/components/admin/catalog/CatalogTabContent");
    expect(source).toContain("@/components/admin/catalog/useAdminCatalogScreenState");
    expect(source).toContain("useAdminCatalogScreenState({");
  });
});
