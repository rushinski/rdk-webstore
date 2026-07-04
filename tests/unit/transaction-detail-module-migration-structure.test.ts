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

  it("keeps legacy transaction detail controller paths as thin shims", () => {
    const legacyDataHookSource = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/components/admin/transactions/order-details/useAdminTransactionDetailData.ts",
      ),
      "utf8",
    );
    const legacyUiHookSource = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/components/admin/transactions/order-details/useAdminTransactionDetailUi.ts",
      ),
      "utf8",
    );
    const legacyDataSource = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/components/admin/transactions/order-details/transactionDetailDataSource.ts",
      ),
      "utf8",
    );

    expect(legacyDataHookSource).toContain(
      "@/modules/orders/presentation/admin/transaction-detail/useAdminTransactionDetailData",
    );
    expect(legacyUiHookSource).toContain(
      "@/modules/orders/presentation/admin/transaction-detail/useAdminTransactionDetailUi",
    );
    expect(legacyDataSource).toContain(
      "@/modules/orders/presentation/admin/transaction-detail/transactionDetailDataSource",
    );
  });
});
