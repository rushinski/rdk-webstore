import fs from "node:fs";
import path from "node:path";

describe("admin dashboard screen structure", () => {
  it("keeps the route page thin by delegating to a focused screen component", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "app/admin/dashboard/page.tsx"),
      "utf8",
    );

    expect(source).toContain("@/components/admin/dashboard/AdminDashboardScreen");
    expect(source).toContain("<AdminDashboardScreen />");
  });

  it("delegates dashboard loading and stat mapping to focused modules", () => {
    const screenSource = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/components/admin/dashboard/AdminDashboardScreen.tsx",
      ),
      "utf8",
    );

    expect(screenSource).toContain(
      "@/components/admin/dashboard/useAdminDashboardData",
    );
    expect(screenSource).toContain(
      "@/components/admin/dashboard/adminDashboardView",
    );
    expect(screenSource).toContain("buildAdminDashboardStats(");
  });
});
