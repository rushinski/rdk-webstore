import fs from "node:fs";
import path from "node:path";

describe("product service structure", () => {
  it("delegates product write normalization and validation helpers to a focused module", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/services/product-service.ts"),
      "utf8",
    );
    const helperSource = fs.readFileSync(
      path.join(process.cwd(), "src/services/product-write-helpers.ts"),
      "utf8",
    );

    expect(source).toContain("@/services/product-write-helpers");
    expect(helperSource).toContain("normalizeArchiveFilters");
    expect(helperSource).toContain("normalizeVariantSortOrder");
    expect(helperSource).toContain("normalizeGoLiveAt");
  });
});
