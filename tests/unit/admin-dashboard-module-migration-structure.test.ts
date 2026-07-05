import fs from "node:fs";
import path from "node:path";

const read = (relativePath: string) =>
  fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");

describe("admin dashboard module migration structure", () => {
  it("makes the dashboard screen and support helpers module-owned", () => {
    const modulePaths = [
      "src/modules/dashboard/presentation/admin/AdminDashboardScreen.tsx",
      "src/modules/dashboard/presentation/admin/adminDashboardView.ts",
      "src/modules/dashboard/presentation/admin/SalesChart.tsx",
      "src/modules/dashboard/presentation/admin/useAdminDashboardData.ts",
    ];

    for (const modulePath of modulePaths) {
      expect(read(modulePath)).toContain("export ");
    }
  });

  it("keeps the legacy dashboard paths as thin shims", () => {
    const legacyPaths = [
      "src/components/admin/dashboard/AdminDashboardScreen.tsx",
      "src/components/admin/dashboard/adminDashboardView.ts",
      "src/components/admin/dashboard/useAdminDashboardData.ts",
      "src/components/admin/charts/SalesChart.tsx",
    ];

    for (const legacyPath of legacyPaths) {
      expect(read(legacyPath)).toContain("@/modules/dashboard/presentation/admin/");
    }
  });
});
