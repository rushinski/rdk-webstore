import fs from "node:fs";
import path from "node:path";

describe("transaction detail view module migration structure", () => {
  it("makes transaction detail view-model helpers module-owned", () => {
    const detailViewSource = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/modules/orders/presentation/admin/transaction-detail/transactionDetailView.tsx",
      ),
      "utf8",
    );
    const paymentViewSource = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/modules/orders/presentation/admin/transaction-detail/transactionPaymentView.tsx",
      ),
      "utf8",
    );
    const emailViewSource = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/modules/orders/presentation/admin/transaction-detail/transactionEmailView.tsx",
      ),
      "utf8",
    );

    expect(detailViewSource).toContain("buildTransactionDetailViewModel");
    expect(paymentViewSource).toContain("getOrderStatusMeta");
    expect(emailViewSource).toContain("getEmailTypeMeta");
  });

  it("removes legacy transaction detail view duplicates after module migration", () => {
    const legacyPaths = [
      "src/components/admin/transactions/order-details/transactionDetailView.tsx",
      "src/components/admin/transactions/order-details/transactionPaymentView.tsx",
      "src/components/admin/transactions/order-details/transactionEmailView.tsx",
    ];

    for (const legacyPath of legacyPaths) {
      expect(fs.existsSync(path.join(process.cwd(), legacyPath))).toBe(false);
    }
  });
});
