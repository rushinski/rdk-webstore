import fs from "node:fs";
import path from "node:path";

describe("admin transactions data source structure", () => {
  it("keeps transport and query-param building in a focused data-source module", () => {
    const hookSource = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/components/admin/transactions/useAdminTransactionsData.ts",
      ),
      "utf8",
    );
    const dataSource = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/components/admin/transactions/transactionsDataSource.ts",
      ),
      "utf8",
    );

    expect(hookSource).toContain(
      "@/components/admin/transactions/transactionsDataSource",
    );
    expect(dataSource).toContain("buildTransactionQueryParams");
    expect(dataSource).toContain("fetchTransactionOrders");
    expect(dataSource).toContain("fetchTransactionCounts");
  });
});
