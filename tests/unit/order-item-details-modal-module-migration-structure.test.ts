import fs from "node:fs";
import path from "node:path";

describe("order item details modal module migration structure", () => {
  it("makes modal, types, and financial helpers module-owned", () => {
    const modalSource = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/modules/orders/presentation/admin/order-item-details/OrderItemDetailsModal.tsx",
      ),
      "utf8",
    );
    const typesSource = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/modules/orders/presentation/admin/order-item-details/orderItemDetailsTypes.ts",
      ),
      "utf8",
    );
    const financialsSource = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/modules/orders/presentation/admin/order-item-details/orderItemFinancials.ts",
      ),
      "utf8",
    );

    expect(modalSource).toContain("export function AdminOrderItemDetailsModal");
    expect(typesSource).toContain("export type AdminOrderItem");
    expect(financialsSource).toContain("getOrderItemFinancials");
  });

  it("keeps the legacy modal path as a thin shim", () => {
    const legacyModalSource = fs.readFileSync(
      path.join(process.cwd(), "src/components/admin/orders/OrderItemDetailsModal.tsx"),
      "utf8",
    );

    expect(legacyModalSource).toContain(
      "@/modules/orders/presentation/admin/order-item-details/OrderItemDetailsModal",
    );
    expect(legacyModalSource).toContain(
      "@/modules/orders/presentation/admin/order-item-details/orderItemDetailsTypes",
    );
    expect(legacyModalSource).toContain(
      "@/modules/orders/presentation/admin/order-item-details/orderItemFinancials",
    );
  });
});
