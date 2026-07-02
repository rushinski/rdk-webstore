import fs from "node:fs";
import path from "node:path";

describe("state detail modal data structure", () => {
  it("delegates state sales-log requests to a focused request module", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/components/admin/nexus/useStateDetailSalesLog.ts"),
      "utf8",
    );

    expect(source).toContain("@/components/admin/nexus/stateDetailRequests");
    expect(source).toContain("loadStateSalesLogRequest(");
  });
});
