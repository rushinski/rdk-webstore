import fs from "node:fs";
import path from "node:path";

describe("inventory toolbar filters structure", () => {
  it("delegates stock tabs and filter controls to focused subcomponents", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/components/admin/inventory/InventoryToolbar.tsx"),
      "utf8",
    );

    expect(source).toContain("@/components/admin/inventory/InventoryStockStatusTabs");
    expect(source).toContain("@/components/admin/inventory/InventoryFilterControls");
    expect(source).toContain("<InventoryStockStatusTabs");
    expect(source).toContain("<InventoryFilterControls");
  });
});
