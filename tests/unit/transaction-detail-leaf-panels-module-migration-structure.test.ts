import fs from "node:fs";
import path from "node:path";

const read = (relativePath: string) =>
  fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");

describe("transaction detail leaf panels module migration structure", () => {
  it("makes transaction detail leaf panels and shared helpers module-owned", () => {
    const modulePaths = [
      "src/modules/orders/presentation/admin/transaction-detail/TransactionOrderDetailsPanel.tsx",
      "src/modules/orders/presentation/admin/transaction-detail/TransactionCustomerPanel.tsx",
      "src/modules/orders/presentation/admin/transaction-detail/TransactionPaymentMethodPanel.tsx",
      "src/modules/orders/presentation/admin/transaction-detail/TransactionShippingPanel.tsx",
      "src/modules/orders/presentation/admin/transaction-detail/TransactionPriceBreakdownItemList.tsx",
      "src/modules/orders/presentation/admin/transaction-detail/TransactionPriceBreakdownTotals.tsx",
      "src/modules/orders/presentation/admin/transaction-detail/transactionPriceBreakdownView.ts",
      "src/modules/orders/presentation/admin/transaction-detail/transactionDetailShared.tsx",
    ];

    for (const modulePath of modulePaths) {
      expect(read(modulePath)).toContain("export ");
    }
  });

  it("removes legacy leaf panel and helper duplicates after module migration", () => {
    const legacyPaths = [
      "src/components/admin/transactions/order-details/TransactionOrderDetailsPanel.tsx",
      "src/components/admin/transactions/order-details/TransactionCustomerPanel.tsx",
      "src/components/admin/transactions/order-details/TransactionPaymentMethodPanel.tsx",
      "src/components/admin/transactions/order-details/TransactionShippingPanel.tsx",
      "src/components/admin/transactions/order-details/TransactionPriceBreakdownItemList.tsx",
      "src/components/admin/transactions/order-details/TransactionPriceBreakdownTotals.tsx",
      "src/components/admin/transactions/order-details/transactionPriceBreakdownView.ts",
      "src/components/admin/transactions/order-details/transactionDetailShared.tsx",
    ];

    for (const legacyPath of legacyPaths) {
      expect(fs.existsSync(path.join(process.cwd(), legacyPath))).toBe(false);
    }
  });
});
