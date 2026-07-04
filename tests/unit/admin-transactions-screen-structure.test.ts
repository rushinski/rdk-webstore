import fs from "node:fs";
import path from "node:path";

describe("admin transactions screen structure", () => {
  it("routes the admin transactions page through the transactions module boundary", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "app/admin/transactions/page.tsx"),
      "utf8",
    );

    expect(source).toContain("@/modules/orders/presentation/admin/transactions");
    expect(source).toContain("<AdminTransactionsScreen />");
  });

  it("delegates tabs, search, table, and pagination to focused transaction components", () => {
    const source = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/modules/orders/presentation/admin/transactions/AdminTransactionsScreen.tsx",
      ),
      "utf8",
    );

    expect(source).toContain("@/modules/orders/presentation/admin/transactions/TransactionsTabBar");
    expect(source).toContain("@/modules/orders/presentation/admin/transactions/TransactionsSearchBar");
    expect(source).toContain("@/modules/orders/presentation/admin/transactions/TransactionsTable");
    expect(source).toContain("@/modules/orders/presentation/admin/transactions/TransactionsPagination");
  });

  it("keeps transaction filtering in the focused transactions view helper", () => {
    const source = fs.readFileSync(
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

    expect(source).toContain("@/modules/orders/presentation/admin/transactions/transactionsView");
    expect(tableSource).toContain("buildTransactionRowModel");
  });
});
