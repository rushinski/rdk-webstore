import fs from "node:fs";
import path from "node:path";

describe("admin sidebar structure", () => {
  it("delegates navigation schema to a focused sidebar navigation module", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/components/admin/AdminSidebar.tsx"),
      "utf8",
    );
    const navSource = fs.readFileSync(
      path.join(process.cwd(), "src/components/admin/sidebar/adminSidebarNavigation.ts"),
      "utf8",
    );

    expect(source).toContain("@/components/admin/sidebar/adminSidebarNavigation");
    expect(navSource).toContain("export const adminSidebarItems");
    expect(navSource).toContain("getAdminSidebarActiveGroups");
  });

  it("delegates the sidebar body rendering to a focused content component", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/components/admin/AdminSidebar.tsx"),
      "utf8",
    );
    const contentSource = fs.readFileSync(
      path.join(process.cwd(), "src/components/admin/sidebar/AdminSidebarContent.tsx"),
      "utf8",
    );

    expect(source).toContain("@/components/admin/sidebar/AdminSidebarContent");
    expect(contentSource).toContain("@/components/admin/sidebar/AdminSidebarProfileDock");
    expect(contentSource).toContain("@/components/admin/shell/AdminNavItem");
  });
});
