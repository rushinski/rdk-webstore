import fs from "node:fs";
import path from "node:path";

describe("payment event drawer structure", () => {
  it("delegates event summary and related log rendering to focused components", () => {
    const source = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/modules/orders/presentation/admin/transaction-detail/PaymentEventDrawer.tsx",
      ),
      "utf8",
    );

    expect(source).toContain("PaymentEventSummaryPanel");
    expect(source).toContain("PaymentEventRelatedLogsPanel");
    expect(source).toContain("<PaymentEventSummaryPanel");
    expect(source).toContain("<PaymentEventRelatedLogsPanel");
  });
});
