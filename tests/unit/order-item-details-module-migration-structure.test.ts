import fs from "node:fs";
import path from "node:path";

describe("order item details module migration structure", () => {
  it("makes orders presentation helpers module-owned", () => {
    const viewSource = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/modules/orders/presentation/admin/order-item-details/orderItemDetailsView.ts",
      ),
      "utf8",
    );
    const imageSource = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/modules/orders/presentation/admin/order-item-details/orderItemDetailsImages.ts",
      ),
      "utf8",
    );
    const stateSource = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/modules/orders/presentation/admin/order-item-details/useOrderItemDetailsModalState.ts",
      ),
      "utf8",
    );

    expect(viewSource).toContain("getOrderItemTitle");
    expect(imageSource).toContain("getOrderItemImages");
    expect(stateSource).toContain("useOrderItemDetailsModalState");
  });

  it("removes legacy order item detail helper duplicates after module migration", () => {
    const legacyPaths = [
      "src/components/admin/orders/orderItemDetailsView.ts",
      "src/components/admin/orders/orderItemDetailsImages.ts",
      "src/components/admin/orders/useOrderItemDetailsModalState.ts",
    ];

    for (const legacyPath of legacyPaths) {
      expect(fs.existsSync(path.join(process.cwd(), legacyPath))).toBe(false);
    }
  });
});
