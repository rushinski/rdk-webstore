import fs from "node:fs";
import path from "node:path";

const read = (relativePath: string) =>
  fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");

describe("admin dashboard module migration structure", () => {
  it("makes the dashboard screen module-owned", () => {
    expect(read("src/modules/dashboard/presentation/admin/AdminDashboardScreen.tsx")).toContain(
      "export function AdminDashboardScreen",
    );
  });

  it("keeps the legacy dashboard screen path as a thin shim", () => {
    expect(read("src/components/admin/dashboard/AdminDashboardScreen.tsx")).toContain(
      "@/modules/dashboard/presentation/admin/AdminDashboardScreen",
    );
  });
});
