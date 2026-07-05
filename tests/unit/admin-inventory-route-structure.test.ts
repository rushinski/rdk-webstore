import fs from "node:fs";
import path from "node:path";

describe("admin inventory route structure", () => {
  it("routes the admin inventory page through the inventory module boundary", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "app/admin/inventory/page.tsx"),
      "utf8",
    );

    expect(source).toContain("@/modules/catalog/presentation/admin/inventory");
    expect(source).toContain("<InventoryClient");
  });
});
