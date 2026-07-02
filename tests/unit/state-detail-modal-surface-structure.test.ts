import fs from "node:fs";
import path from "node:path";

describe("state detail modal surface structure", () => {
  it("delegates status badges, alerts, and summary metrics to focused components", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/components/admin/nexus/StateDetailModal.tsx"),
      "utf8",
    );

    expect(source).toContain("@/components/admin/nexus/StateDetailStatusBadges");
    expect(source).toContain("@/components/admin/nexus/StateDetailAlerts");
    expect(source).toContain("@/components/admin/nexus/StateDetailSummaryGrid");
    expect(source).toContain("<StateDetailStatusBadges");
    expect(source).toContain("<StateDetailAlerts");
    expect(source).toContain("<StateDetailSummaryGrid");
  });
});
