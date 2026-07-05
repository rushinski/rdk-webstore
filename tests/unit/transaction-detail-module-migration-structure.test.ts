import fs from "node:fs";
import path from "node:path";

describe("transaction detail module migration structure", () => {
  it("makes transaction detail controller files module-owned", () => {
    const dataHookSource = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/modules/orders/presentation/admin/transaction-detail/useAdminTransactionDetailData.ts",
      ),
      "utf8",
    );
    const uiHookSource = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/modules/orders/presentation/admin/transaction-detail/useAdminTransactionDetailUi.ts",
      ),
      "utf8",
    );
    const dataSource = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/modules/orders/presentation/admin/transaction-detail/transactionDetailDataSource.ts",
      ),
      "utf8",
    );

    expect(dataHookSource).toContain("export function useAdminTransactionDetailData");
    expect(uiHookSource).toContain("export function useAdminTransactionDetailUi");
    expect(dataSource).toContain("fetchTransactionDetailPayload");
  });

  it("removes legacy transaction detail controller duplicates after module migration", () => {
    const legacyPaths = [
      "src/components/admin/transactions/order-details/useAdminTransactionDetailData.ts",
      "src/components/admin/transactions/order-details/useAdminTransactionDetailUi.ts",
      "src/components/admin/transactions/order-details/transactionDetailDataSource.ts",
    ];

    for (const legacyPath of legacyPaths) {
      expect(fs.existsSync(path.join(process.cwd(), legacyPath))).toBe(false);
    }
  });
});
