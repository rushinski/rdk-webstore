import fs from "node:fs";
import path from "node:path";

describe("state detail module migration structure", () => {
  it("keeps the module state-detail modal wired to module-owned sections and sales-log hook", () => {
    const source = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/modules/nexus/presentation/admin/StateDetailModal.tsx",
      ),
      "utf8",
    );

    expect(source).toContain("@/modules/nexus/presentation/admin/StateDetailAlerts");
    expect(source).toContain(
      "@/modules/nexus/presentation/admin/StateDetailStatusBadges",
    );
    expect(source).toContain(
      "@/modules/nexus/presentation/admin/StateDetailSummaryGrid",
    );
    expect(source).toContain(
      "@/modules/nexus/presentation/admin/StateRegistrationSetupSection",
    );
    expect(source).toContain(
      "@/modules/nexus/presentation/admin/StateSalesHistorySection",
    );
    expect(source).toContain(
      "@/modules/nexus/presentation/admin/useStateDetailSalesLog",
    );
  });
});
