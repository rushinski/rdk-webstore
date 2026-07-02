import fs from "node:fs";
import path from "node:path";

describe("admin line chart structure", () => {
  it("delegates chart data normalization and axis calculation to a focused helper module", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/components/admin/charts/AdminLineChart.tsx"),
      "utf8",
    );

    expect(source).toContain("@/components/admin/charts/adminLineChartData");
    expect(source).toContain("normalizeLineChartData(");
    expect(source).toContain("getLineChartYAxis(");
  });

  it("delegates responsive chart sizing to a focused hook", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/components/admin/charts/AdminLineChart.tsx"),
      "utf8",
    );

    expect(source).toContain("@/components/admin/charts/useAdminLineChartSizing");
    expect(source).toContain("useAdminLineChartSizing(height)");
  });
});
