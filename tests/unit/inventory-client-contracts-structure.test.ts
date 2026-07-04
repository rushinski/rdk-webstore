import fs from "node:fs";
import path from "node:path";

describe("inventory client contracts structure", () => {
  it("shares typed contracts across the inventory child surfaces", () => {
    const toolbarSource = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/modules/catalog/presentation/admin/inventory/InventoryToolbar.tsx",
      ),
      "utf8",
    );
    const contentSource = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/modules/catalog/presentation/admin/inventory/InventoryClientContent.tsx",
      ),
      "utf8",
    );
    const dialogsSource = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/modules/catalog/presentation/admin/inventory/InventoryDialogs.tsx",
      ),
      "utf8",
    );

    expect(toolbarSource).toContain(
      "@/modules/catalog/presentation/admin/inventory/inventoryClientContracts",
    );
    expect(contentSource).toContain(
      "@/modules/catalog/presentation/admin/inventory/inventoryClientContracts",
    );
    expect(dialogsSource).toContain(
      "@/modules/catalog/presentation/admin/inventory/inventoryClientContracts",
    );
  });
});
