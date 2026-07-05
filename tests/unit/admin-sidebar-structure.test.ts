import fs from "node:fs";
import path from "node:path";

describe("admin sidebar structure", () => {
  it("delegates navigation schema to a focused sidebar navigation module", () => {
    const source = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/modules/shared/presentation/admin/shell/AdminSidebar.tsx",
      ),
      "utf8",
    );
    const navSource = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/modules/shared/presentation/admin/shell/adminSidebarNavigation.ts",
      ),
      "utf8",
    );

    expect(source).toContain(
      "@/modules/shared/presentation/admin/shell/adminSidebarNavigation",
    );
    expect(navSource).toContain("export const adminSidebarItems");
    expect(navSource).toContain("getAdminSidebarActiveGroups");
  });

  it("delegates the sidebar body rendering to a focused content component", () => {
    const source = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/modules/shared/presentation/admin/shell/AdminSidebar.tsx",
      ),
      "utf8",
    );
    const contentSource = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/modules/shared/presentation/admin/shell/AdminSidebarContent.tsx",
      ),
      "utf8",
    );

    expect(source).toContain(
      "@/modules/shared/presentation/admin/shell/AdminSidebarContent",
    );
    expect(contentSource).toContain(
      "@/modules/shared/presentation/admin/shell/AdminSidebarProfileDock",
    );
    expect(contentSource).toContain(
      "@/modules/shared/presentation/admin/shell/AdminNavItem",
    );
  });
});
