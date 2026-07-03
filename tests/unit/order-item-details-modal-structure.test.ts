import fs from "node:fs";
import path from "node:path";

describe("order item details modal structure", () => {
  it("delegates image gallery and metadata rendering to focused components", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/components/admin/orders/OrderItemDetailsModal.tsx"),
      "utf8",
    );

    expect(source).toContain("@/components/admin/orders/OrderItemImageGallery");
    expect(source).toContain("@/components/admin/orders/OrderItemMetadataPanel");
    expect(source).toContain("<OrderItemImageGallery");
    expect(source).toContain("<OrderItemMetadataPanel");
  });

  it("delegates order item formatting helpers to a focused view module", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/components/admin/orders/OrderItemDetailsModal.tsx"),
      "utf8",
    );

    expect(source).toContain("@/components/admin/orders/orderItemDetailsView");
    expect(source).toContain("formatOrderItemDateTime(");
    expect(source).toContain("getOrderItemTitle(");
  });

  it("delegates image normalization and modal state wiring to focused helpers", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/components/admin/orders/OrderItemDetailsModal.tsx"),
      "utf8",
    );

    expect(source).toContain("@/components/admin/orders/orderItemDetailsImages");
    expect(source).toContain("@/components/admin/orders/useOrderItemDetailsModalState");
    expect(source).toContain("getOrderItemImages(");
    expect(source).toContain("useOrderItemDetailsModalState(");
  });
});
