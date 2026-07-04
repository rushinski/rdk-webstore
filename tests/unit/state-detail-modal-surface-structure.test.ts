import fs from "node:fs";
import path from "node:path";

describe("state detail modal surface structure", () => {
  it("delegates status badges, alerts, and summary metrics to focused components", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/modules/nexus/presentation/admin/StateDetailModal.tsx"),
      "utf8",
    );

    expect(source).toContain("@/modules/nexus/presentation/admin/StateDetailStatusBadges");
    expect(source).toContain("@/modules/nexus/presentation/admin/StateDetailAlerts");
    expect(source).toContain("@/modules/nexus/presentation/admin/StateDetailSummaryGrid");
    expect(source).toContain("<StateDetailStatusBadges");
    expect(source).toContain("<StateDetailAlerts");
    expect(source).toContain("<StateDetailSummaryGrid");
  });
});
