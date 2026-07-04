import fs from "node:fs";
import path from "node:path";

describe("transaction fulfillment panels structure", () => {
  it("delegates shipping and payment method panels to focused components", () => {
    const source = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/modules/orders/presentation/admin/transaction-detail/TransactionFulfillmentPanels.tsx",
      ),
      "utf8",
    );

    expect(source).toContain("TransactionShippingPanel");
    expect(source).toContain("TransactionPaymentMethodPanel");
    expect(source).toContain("<TransactionShippingPanel");
    expect(source).toContain("<TransactionPaymentMethodPanel");
  });
});
