import fs from "node:fs";
import path from "node:path";

describe("state detail modal structure", () => {
  it("delegates sales history and registration setup sections to focused components", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/components/admin/nexus/StateDetailModal.tsx"),
      "utf8",
    );

    expect(source).toContain("@/components/admin/nexus/StateSalesHistorySection");
    expect(source).toContain("@/components/admin/nexus/StateRegistrationSetupSection");
    expect(source).toContain("<StateSalesHistorySection");
    expect(source).toContain("<StateRegistrationSetupSection");
  });

  it("delegates shared sales-log types to a focused module", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/components/admin/nexus/StateDetailModal.tsx"),
      "utf8",
    );
    const typesSource = fs.readFileSync(
      path.join(process.cwd(), "src/components/admin/nexus/stateDetailTypes.ts"),
      "utf8",
    );

    expect(source).toContain("@/components/admin/nexus/stateDetailTypes");
    expect(typesSource).toContain("type SalesLog");
  });
});
