import fs from "node:fs";
import path from "node:path";

describe("admin transactions screen structure", () => {
  it("delegates tabs, search, table, and pagination to focused transaction components", () => {
    const source = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/components/admin/transactions/AdminTransactionsScreen.tsx",
      ),
      "utf8",
    );

    expect(source).toContain("@/components/admin/transactions/TransactionsTabBar");
    expect(source).toContain("@/components/admin/transactions/TransactionsSearchBar");
    expect(source).toContain("@/components/admin/transactions/TransactionsTable");
    expect(source).toContain("@/components/admin/transactions/TransactionsPagination");
  });

  it("keeps transaction filtering in the focused transactions view helper", () => {
    const source = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/components/admin/transactions/AdminTransactionsScreen.tsx",
      ),
      "utf8",
    );
    const tableSource = fs.readFileSync(
      path.join(process.cwd(), "src/components/admin/transactions/TransactionsTable.tsx"),
      "utf8",
    );

    expect(source).toContain("@/components/admin/transactions/transactionsView");
    expect(tableSource).toContain("buildTransactionRowModel");
  });
});
