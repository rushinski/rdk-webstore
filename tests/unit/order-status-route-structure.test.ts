import fs from "node:fs";
import path from "node:path";

describe("order status route structure", () => {
  it("routes order status through the orders module boundary", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "app/order-status/[orderId]/page.tsx"),
      "utf8",
    );

    expect(source).toContain("@/modules/orders");
    expect(source).toContain("<OrderStatusPageContent />");
  });
});
