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

  it("keeps legacy helper paths as thin presentation shims", () => {
    const legacyViewSource = fs.readFileSync(
      path.join(process.cwd(), "src/components/admin/orders/orderItemDetailsView.ts"),
      "utf8",
    );
    const legacyImageSource = fs.readFileSync(
      path.join(process.cwd(), "src/components/admin/orders/orderItemDetailsImages.ts"),
      "utf8",
    );
    const legacyStateSource = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/components/admin/orders/useOrderItemDetailsModalState.ts",
      ),
      "utf8",
    );

    expect(legacyViewSource).toContain(
      "@/modules/orders/presentation/admin/order-item-details/orderItemDetailsView",
    );
    expect(legacyImageSource).toContain(
      "@/modules/orders/presentation/admin/order-item-details/orderItemDetailsImages",
    );
    expect(legacyStateSource).toContain(
      "@/modules/orders/presentation/admin/order-item-details/useOrderItemDetailsModalState",
    );
  });
});
