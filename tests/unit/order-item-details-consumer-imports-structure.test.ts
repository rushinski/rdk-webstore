import fs from "node:fs";
import path from "node:path";

const read = (relativePath: string) =>
  fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");

describe("order item details consumer imports", () => {
  it("points downstream admin surfaces at the module entrypoint instead of the legacy shim", () => {
    const transactionDetailScreen = read(
      "src/components/admin/transactions/order-details/AdminTransactionDetailScreen.tsx",
    );
    const shippingDialogs = read("src/components/admin/shipping/ShippingDialogs.tsx");
    const pickupsFeedback = read("src/components/admin/pickups/PickupsFeedback.tsx");
    const shippingOrdersTableView = read(
      "src/components/admin/shipping/shippingOrdersTableView.tsx",
    );
    const pickupOrdersTableView = read(
      "src/components/admin/pickups/pickupOrdersTableView.ts",
    );

    expect(transactionDetailScreen).toContain(
      "@/modules/orders/presentation/admin/order-item-details",
    );
    expect(shippingDialogs).toContain(
      "@/modules/orders/presentation/admin/order-item-details",
    );
    expect(pickupsFeedback).toContain(
      "@/modules/orders/presentation/admin/order-item-details",
    );
    expect(shippingOrdersTableView).toContain(
      "@/modules/orders/presentation/admin/order-item-details",
    );
    expect(pickupOrdersTableView).toContain(
      "@/modules/orders/presentation/admin/order-item-details",
    );
  });
});
