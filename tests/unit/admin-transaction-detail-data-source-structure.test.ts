import fs from "node:fs";
import path from "node:path";

describe("admin transaction detail data source structure", () => {
  it("delegates transaction detail transport and response shaping to a focused module", () => {
    const hookSource = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/components/admin/transactions/order-details/useAdminTransactionDetailData.ts",
      ),
      "utf8",
    );
    const dataSource = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/components/admin/transactions/order-details/transactionDetailDataSource.ts",
      ),
      "utf8",
    );

    expect(hookSource).toContain(
      "@/components/admin/transactions/order-details/transactionDetailDataSource",
    );
    expect(dataSource).toContain("fetchTransactionDetailPayload");
    expect(dataSource).toContain("paymentEvents");
    expect(dataSource).toContain("checkoutLogs");
  });
});
