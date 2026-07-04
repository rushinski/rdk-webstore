import fs from "node:fs";
import path from "node:path";

describe("transaction detail mutations module migration structure", () => {
  it("makes mutation controller files module-owned", () => {
    const hookSource = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/modules/orders/presentation/admin/transaction-detail/useAdminTransactionDetailMutations.ts",
      ),
      "utf8",
    );
    const requestSource = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/modules/orders/presentation/admin/transaction-detail/transactionDetailMutationRequests.ts",
      ),
      "utf8",
    );
    const viewSource = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/modules/orders/presentation/admin/transaction-detail/transactionDetailMutationView.ts",
      ),
      "utf8",
    );

    expect(hookSource).toContain("export function useAdminTransactionDetailMutations");
    expect(requestSource).toContain("refundOrderRequest");
    expect(viewSource).toContain("buildRefundSuccessToast");
  });

  it("keeps legacy mutation controller paths as thin shims", () => {
    const legacyHookSource = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/components/admin/transactions/order-details/useAdminTransactionDetailMutations.ts",
      ),
      "utf8",
    );
    const legacyRequestSource = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/components/admin/transactions/order-details/transactionDetailMutationRequests.ts",
      ),
      "utf8",
    );
    const legacyViewSource = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/components/admin/transactions/order-details/transactionDetailMutationView.ts",
      ),
      "utf8",
    );

    expect(legacyHookSource).toContain(
      "@/modules/orders/presentation/admin/transaction-detail/useAdminTransactionDetailMutations",
    );
    expect(legacyRequestSource).toContain(
      "@/modules/orders/presentation/admin/transaction-detail/transactionDetailMutationRequests",
    );
    expect(legacyViewSource).toContain(
      "@/modules/orders/presentation/admin/transaction-detail/transactionDetailMutationView",
    );
  });
});
