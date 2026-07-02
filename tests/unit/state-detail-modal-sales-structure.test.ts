import fs from "node:fs";
import path from "node:path";

describe("state detail modal sales structure", () => {
  it("delegates sales-log state and pagination workflows to a focused hook", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/components/admin/nexus/StateDetailModal.tsx"),
      "utf8",
    );

    expect(source).toContain("@/components/admin/nexus/useStateDetailSalesLog");
    expect(source).toContain("useStateDetailSalesLog(");
  });
});
