import fs from "node:fs";
import path from "node:path";

describe("order item details modal structure", () => {
  it("delegates image gallery and metadata rendering to focused components", () => {
    const source = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/modules/orders/presentation/admin/order-item-details/OrderItemDetailsModal.tsx",
      ),
      "utf8",
    );

    expect(source).toContain(
      "@/modules/orders/presentation/admin/order-item-details/OrderItemImageGallery",
    );
    expect(source).toContain(
      "@/modules/orders/presentation/admin/order-item-details/OrderItemMetadataPanel",
    );
    expect(source).toContain("<OrderItemImageGallery");
    expect(source).toContain("<OrderItemMetadataPanel");
  });

  it("delegates order item formatting helpers to a focused view module", () => {
    const source = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/modules/orders/presentation/admin/order-item-details/OrderItemDetailsModal.tsx",
      ),
      "utf8",
    );

    expect(source).toContain(
      "@/modules/orders/presentation/admin/order-item-details/orderItemDetailsView",
    );
    expect(source).toContain("formatOrderItemDateTime(");
    expect(source).toContain("getOrderItemTitle(");
  });

  it("delegates image normalization and modal state wiring to focused helpers", () => {
    const source = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/modules/orders/presentation/admin/order-item-details/OrderItemDetailsModal.tsx",
      ),
      "utf8",
    );

    expect(source).toContain(
      "@/modules/orders/presentation/admin/order-item-details/orderItemDetailsImages",
    );
    expect(source).toContain(
      "@/modules/orders/presentation/admin/order-item-details/useOrderItemDetailsModalState",
    );
    expect(source).toContain("getOrderItemImages(");
    expect(source).toContain("useOrderItemDetailsModalState(");
  });
});
