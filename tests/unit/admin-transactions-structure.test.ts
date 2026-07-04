import fs from "node:fs";
import path from "node:path";

describe("admin transactions structure", () => {
  it("delegates transaction loading and pagination state to a focused hook", () => {
    const source = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/modules/orders/presentation/admin/transactions/AdminTransactionsScreen.tsx",
      ),
      "utf8",
    );

    expect(source).toContain("@/modules/orders/presentation/admin/transactions/useAdminTransactionsData");
    expect(source).toContain("useAdminTransactionsData()");
  });

  it("delegates transaction search and row display helpers to a focused view module", () => {
    const screenSource = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/modules/orders/presentation/admin/transactions/AdminTransactionsScreen.tsx",
      ),
      "utf8",
    );
    const tableSource = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/modules/orders/presentation/admin/transactions/TransactionsTable.tsx",
      ),
      "utf8",
    );

    expect(screenSource).toContain("@/modules/orders/presentation/admin/transactions/transactionsView");
    expect(screenSource).toContain("buildFilteredTransactions(");
    expect(tableSource).toContain("@/modules/orders/presentation/admin/transactions/transactionsView");
    expect(tableSource).toContain("buildTransactionRowModel(");
  });
});
