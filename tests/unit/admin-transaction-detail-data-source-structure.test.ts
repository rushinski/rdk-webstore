import fs from "node:fs";
import path from "node:path";

describe("admin transaction detail data source structure", () => {
  it("delegates transaction detail transport and response shaping to a focused module", () => {
    const hookSource = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/modules/orders/presentation/admin/transaction-detail/useAdminTransactionDetailData.ts",
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

    expect(hookSource).toContain("@/modules/orders/presentation/admin/transaction-detail/transactionDetailDataSource");
    expect(dataSource).toContain("fetchTransactionDetailPayload");
    expect(dataSource).toContain("paymentEvents");
    expect(dataSource).toContain("checkoutLogs");
  });
});
