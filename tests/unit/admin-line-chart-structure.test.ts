import fs from "node:fs";
import path from "node:path";

describe("admin line chart structure", () => {
  it("delegates chart data normalization and axis calculation to a focused helper module", () => {
    const source = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/modules/dashboard/presentation/admin/AdminLineChart.tsx",
      ),
      "utf8",
    );

    expect(source).toContain(
      "@/modules/dashboard/presentation/admin/adminLineChartData",
    );
    expect(source).toContain("normalizeLineChartData(");
    expect(source).toContain("getLineChartYAxis(");
  });

  it("delegates responsive chart sizing to a focused hook", () => {
    const source = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/modules/dashboard/presentation/admin/AdminLineChart.tsx",
      ),
      "utf8",
    );

    expect(source).toContain(
      "@/modules/dashboard/presentation/admin/useAdminLineChartSizing",
    );
    expect(source).toContain("useAdminLineChartSizing(height)");
  });
});
