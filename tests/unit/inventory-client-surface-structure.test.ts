import fs from "node:fs";
import path from "node:path";

describe("inventory client surface structure", () => {
  it("delegates inventory surface prop composition to a focused helper module", () => {
    const source = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/components/admin/inventory/useInventoryClientController.ts",
      ),
      "utf8",
    );

    expect(source).toContain("@/components/admin/inventory/inventoryClientSurface");
    expect(source).toContain("buildInventoryToolbarProps(");
    expect(source).toContain("buildInventoryContentProps(");
    expect(source).toContain("buildInventoryDialogsProps(");
    expect(source).toContain("buildInventoryPaginationProps(");
  });
});
