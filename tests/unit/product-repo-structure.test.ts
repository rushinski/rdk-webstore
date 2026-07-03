import fs from "node:fs";
import path from "node:path";

describe("product repo structure", () => {
  it("delegates repeated select strings and shared query helpers to focused modules", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/repositories/product-repo.ts"),
      "utf8",
    );
    const helperSource = fs.readFileSync(
      path.join(process.cwd(), "src/repositories/product-repo-helpers.ts"),
      "utf8",
    );
    const selectSource = fs.readFileSync(
      path.join(process.cwd(), "src/repositories/product-repo-selects.ts"),
      "utf8",
    );

    expect(source).toContain("@/repositories/product-repo-helpers");
    expect(source).toContain("@/repositories/product-repo-selects");
    expect(helperSource).toContain("resolveProductSearchFields");
    expect(selectSource).toContain("PRODUCT_RELATIONS_SELECT");
  });
});
