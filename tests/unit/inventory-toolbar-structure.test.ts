import fs from "node:fs";
import path from "node:path";

describe("inventory toolbar structure", () => {
  it("delegates bulk selection actions to a focused toolbar subcomponent", () => {
    const source = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/modules/catalog/presentation/admin/inventory/InventoryToolbar.tsx",
      ),
      "utf8",
    );

    expect(source).toContain(
      "@/modules/catalog/presentation/admin/inventory/InventoryBulkActionsBar",
    );
    expect(source).toContain("<InventoryBulkActionsBar");
  });
});
