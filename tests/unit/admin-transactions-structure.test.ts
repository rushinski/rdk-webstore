import fs from "node:fs";
import path from "node:path";

describe("admin transactions structure", () => {
  it("delegates transaction loading and pagination state to a focused hook", () => {
    const source = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/components/admin/transactions/AdminTransactionsScreen.tsx",
      ),
      "utf8",
    );

    expect(source).toContain("@/components/admin/transactions/useAdminTransactionsData");
    expect(source).toContain("useAdminTransactionsData()");
  });

  it("delegates transaction search and row display helpers to a focused view module", () => {
    const source = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/components/admin/transactions/AdminTransactionsScreen.tsx",
      ),
      "utf8",
    );

    expect(source).toContain("@/components/admin/transactions/transactionsView");
    expect(source).toContain("buildFilteredTransactions(");
    expect(source).toContain("buildTransactionRowModel(");
  });
});
