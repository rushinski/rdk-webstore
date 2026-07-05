import fs from "node:fs";
import path from "node:path";

describe("inventory editor route structure", () => {
  it("routes inventory listing data through the catalog inventory module boundary", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "app/admin/inventory/page.tsx"),
      "utf8",
    );

    expect(source).toContain(
      "@/modules/catalog/application/adminInventory",
    );
    expect(source).toContain("getInventoryProducts(filters)");
  });

  it("routes inventory create through the catalog inventory module boundary", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "app/admin/inventory/create/page.tsx"),
      "utf8",
    );

    expect(source).toContain("@/modules/catalog/presentation/admin/inventory");
    expect(source).toContain("<CreateProductPageContent />");
  });

  it("routes inventory edit through the catalog inventory module boundary", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "app/admin/inventory/[id]/edit/page.tsx"),
      "utf8",
    );

    expect(source).toContain("@/modules/catalog/presentation/admin/inventory");
    expect(source).toContain("<EditProductPageContent");
  });
});
