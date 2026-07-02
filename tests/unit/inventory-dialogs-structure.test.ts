import fs from "node:fs";
import path from "node:path";

describe("inventory dialogs structure", () => {
  it("delegates destructive confirmation flows to focused dialog components", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/components/admin/inventory/InventoryDialogs.tsx"),
      "utf8",
    );

    expect(source).toContain("@/components/admin/inventory/InventoryArchiveDialog");
    expect(source).toContain("@/components/admin/inventory/InventoryDeleteDialogs");
    expect(source).toContain("@/components/admin/inventory/InventoryRestoreDialog");
    expect(source).toContain("<InventoryArchiveDialog");
    expect(source).toContain("<InventoryDeleteDialogs");
    expect(source).toContain("<InventoryRestoreDialog");
  });
});
