import fs from "node:fs";
import path from "node:path";

describe("catalog mutations structure", () => {
  it("delegates catalog request execution to a focused request module", () => {
    const source = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/components/admin/catalog/useAdminCatalogMutations.ts",
      ),
      "utf8",
    );

    expect(source).toContain("@/components/admin/catalog/catalogMutationRequests");
    expect(source).toContain("createCatalogBrandRequest(");
    expect(source).toContain("updateCatalogModelRequest(");
  });

  it("delegates catalog duplicate and required-field validation to a focused helper module", () => {
    const source = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/components/admin/catalog/useAdminCatalogMutations.ts",
      ),
      "utf8",
    );

    expect(source).toContain("@/components/admin/catalog/catalogMutationValidation");
    expect(source).toContain("validateCreateAlias(");
    expect(source).toContain("validateCatalogEdit(");
  });
});
