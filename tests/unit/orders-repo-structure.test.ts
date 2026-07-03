import fs from "node:fs";
import path from "node:path";

describe("orders repo structure", () => {
  it("delegates query strings, insert payload shaping, and paging math to focused helpers", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/repositories/orders-repo.ts"),
      "utf8",
    );
    const helperSource = fs.readFileSync(
      path.join(process.cwd(), "src/repositories/orders-repo-helpers.ts"),
      "utf8",
    );

    expect(source).toContain("@/repositories/orders-repo-helpers");
    expect(helperSource).toContain("ORDER_LIST_SELECT");
    expect(helperSource).toContain("buildPendingOrderInsert");
    expect(helperSource).toContain("buildPagedRange");
  });
});
