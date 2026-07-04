import fs from "node:fs";
import path from "node:path";

describe("state detail modal data structure", () => {
  it("delegates state sales-log requests to a focused request module", () => {
    const source = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/modules/nexus/presentation/admin/useStateDetailSalesLog.ts",
      ),
      "utf8",
    );

    expect(source).toContain("@/modules/nexus/presentation/admin/stateDetailRequests");
    expect(source).toContain("loadStateSalesLogRequest(");
  });
});
