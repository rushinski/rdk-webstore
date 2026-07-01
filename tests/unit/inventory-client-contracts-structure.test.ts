import fs from "node:fs";
import path from "node:path";

describe("inventory client contracts structure", () => {
  it("shares typed contracts across the inventory child surfaces", () => {
    const toolbarSource = fs.readFileSync(
      path.join(process.cwd(), "src/components/admin/inventory/InventoryToolbar.tsx"),
      "utf8",
    );
    const contentSource = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/components/admin/inventory/InventoryClientContent.tsx",
      ),
      "utf8",
    );
    const dialogsSource = fs.readFileSync(
      path.join(process.cwd(), "src/components/admin/inventory/InventoryDialogs.tsx"),
      "utf8",
    );

    expect(toolbarSource).toContain(
      "@/components/admin/inventory/inventoryClientContracts",
    );
    expect(contentSource).toContain(
      "@/components/admin/inventory/inventoryClientContracts",
    );
    expect(dialogsSource).toContain(
      "@/components/admin/inventory/inventoryClientContracts",
    );
  });
});
