import fs from "node:fs";
import path from "node:path";

describe("inventory client structure", () => {
  it("delegates the inventory control surface to a focused toolbar component", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/components/admin/inventory/InventoryClient.tsx"),
      "utf8",
    );

    expect(source).toContain("@/components/admin/inventory/InventoryToolbar");
    expect(source).toContain("<InventoryToolbar");
  });

  it("delegates pagination controls to a focused inventory pagination component", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/components/admin/inventory/InventoryClient.tsx"),
      "utf8",
    );

    expect(source).toContain("@/components/admin/inventory/InventoryPagination");
    expect(source).toContain("<InventoryPagination");
  });

  it("delegates modal and confirmation rendering to an inventory dialogs component", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/components/admin/inventory/InventoryClient.tsx"),
      "utf8",
    );

    expect(source).toContain("@/components/admin/inventory/InventoryDialogs");
    expect(source).toContain("<InventoryDialogs");
  });
});
