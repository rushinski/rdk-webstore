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

  it("keeps legacy transaction detail view paths as thin shims", () => {
    const legacyDetailViewSource = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/components/admin/transactions/order-details/transactionDetailView.tsx",
      ),
      "utf8",
    );
    const legacyPaymentViewSource = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/components/admin/transactions/order-details/transactionPaymentView.tsx",
      ),
      "utf8",
    );
    const legacyEmailViewSource = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/components/admin/transactions/order-details/transactionEmailView.tsx",
      ),
      "utf8",
    );

    expect(legacyDetailViewSource).toContain(
      "@/modules/orders/presentation/admin/transaction-detail/transactionDetailView",
    );
    expect(legacyPaymentViewSource).toContain(
      "@/modules/orders/presentation/admin/transaction-detail/transactionPaymentView",
    );
    expect(legacyEmailViewSource).toContain(
      "@/modules/orders/presentation/admin/transaction-detail/transactionEmailView",
    );
  });
});
