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

  it("removes legacy mutation controller duplicates after module migration", () => {
    const legacyPaths = [
      "src/components/admin/transactions/order-details/useAdminTransactionDetailMutations.ts",
      "src/components/admin/transactions/order-details/transactionDetailMutationRequests.ts",
      "src/components/admin/transactions/order-details/transactionDetailMutationView.ts",
    ];

    for (const legacyPath of legacyPaths) {
      expect(fs.existsSync(path.join(process.cwd(), legacyPath))).toBe(false);
    }
  });
});
