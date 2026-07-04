import fs from "node:fs";
import path from "node:path";

const read = (relativePath: string) =>
  fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");

describe("admin transactions module migration structure", () => {
  it("makes the admin transactions listing surface module-owned", () => {
    const modulePaths = [
      "src/modules/orders/presentation/admin/transactions/AdminTransactionsScreen.tsx",
      "src/modules/orders/presentation/admin/transactions/useAdminTransactionsData.ts",
      "src/modules/orders/presentation/admin/transactions/transactionsDataSource.ts",
      "src/modules/orders/presentation/admin/transactions/transactionsView.ts",
      "src/modules/orders/presentation/admin/transactions/TransactionsTable.tsx",
      "src/modules/orders/presentation/admin/transactions/TransactionsPagination.tsx",
      "src/modules/orders/presentation/admin/transactions/TransactionsSearchBar.tsx",
      "src/modules/orders/presentation/admin/transactions/TransactionsTabBar.tsx",
    ];

    for (const modulePath of modulePaths) {
      expect(read(modulePath)).toContain("export ");
    }
  });

  it("keeps legacy admin transactions paths as thin shims", () => {
    const legacyPaths = [
      "src/components/admin/transactions/AdminTransactionsScreen.tsx",
      "src/components/admin/transactions/useAdminTransactionsData.ts",
      "src/components/admin/transactions/transactionsDataSource.ts",
      "src/components/admin/transactions/transactionsView.ts",
      "src/components/admin/transactions/TransactionsTable.tsx",
      "src/components/admin/transactions/TransactionsPagination.tsx",
      "src/components/admin/transactions/TransactionsSearchBar.tsx",
      "src/components/admin/transactions/TransactionsTabBar.tsx",
    ];

    for (const legacyPath of legacyPaths) {
      expect(read(legacyPath)).toContain("@/modules/orders/presentation/admin/transactions/");
    }
  });
});
