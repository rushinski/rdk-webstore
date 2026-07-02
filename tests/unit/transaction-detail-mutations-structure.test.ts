import fs from "node:fs";
import path from "node:path";

describe("transaction detail mutations structure", () => {
  it("delegates transaction mutation requests to a focused request module", () => {
    const source = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/components/admin/transactions/order-details/useAdminTransactionDetailMutations.ts",
      ),
      "utf8",
    );

    expect(source).toContain(
      "@/components/admin/transactions/order-details/transactionDetailMutationRequests",
    );
    expect(source).toContain("refundOrderRequest(");
    expect(source).toContain("resendOrderEmailRequest(");
  });

  it("delegates refund toast shaping and refundable-order projection to a focused view module", () => {
    const source = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/components/admin/transactions/order-details/useAdminTransactionDetailMutations.ts",
      ),
      "utf8",
    );

    expect(source).toContain(
      "@/components/admin/transactions/order-details/transactionDetailMutationView",
    );
    expect(source).toContain("buildRefundSuccessToast(");
    expect(source).toContain("buildRefundableOrderView(");
  });
});
