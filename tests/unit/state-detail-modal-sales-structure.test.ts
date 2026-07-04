import fs from "node:fs";
import path from "node:path";

describe("state detail modal sales structure", () => {
  it("delegates sales-log state and pagination workflows to a focused hook", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/modules/nexus/presentation/admin/StateDetailModal.tsx"),
      "utf8",
    );

    expect(source).toContain("@/modules/nexus/presentation/admin/useStateDetailSalesLog");
    expect(source).toContain("useStateDetailSalesLog(");
  });
});
