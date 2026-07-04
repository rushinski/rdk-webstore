import fs from "node:fs";
import path from "node:path";

describe("transaction detail view structure", () => {
  it("delegates payment-specific formatting and event helpers to a focused module", () => {
    const source = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/modules/orders/presentation/admin/transaction-detail/transactionDetailView.tsx",
      ),
      "utf8",
    );

    expect(source).toContain(
      "@/modules/orders/presentation/admin/transaction-detail/transactionPaymentView",
    );
    expect(source).toContain("getOrderStatusMeta");
    expect(source).toContain("getEventMeta");
  });

  it("delegates email and checkout-log helpers to a focused module", () => {
    const source = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/modules/orders/presentation/admin/transaction-detail/transactionDetailView.tsx",
      ),
      "utf8",
    );

    expect(source).toContain(
      "@/modules/orders/presentation/admin/transaction-detail/transactionEmailView",
    );
    expect(source).toContain("getEmailTypeMeta");
    expect(source).toContain("getRelatedCheckoutLogs");
  });
});
