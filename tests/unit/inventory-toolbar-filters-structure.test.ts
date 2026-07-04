import fs from "node:fs";
import path from "node:path";

describe("inventory toolbar filters structure", () => {
  it("delegates stock tabs and filter controls to focused subcomponents", () => {
    const source = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/modules/catalog/presentation/admin/inventory/InventoryToolbar.tsx",
      ),
      "utf8",
    );

    expect(source).toContain(
      "@/modules/catalog/presentation/admin/inventory/InventoryStockStatusTabs",
    );
    expect(source).toContain(
      "@/modules/catalog/presentation/admin/inventory/InventoryFilterControls",
    );
    expect(source).toContain("<InventoryStockStatusTabs");
    expect(source).toContain("<InventoryFilterControls");
  });
});
