import fs from "node:fs";
import path from "node:path";

const read = (relativePath: string) =>
  fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");

describe("transaction detail section shells module migration structure", () => {
  it("makes the transaction detail section shells module-owned", () => {
    const modulePaths = [
      "src/modules/orders/presentation/admin/transaction-detail/TransactionHeaderActions.tsx",
      "src/modules/orders/presentation/admin/transaction-detail/TransactionPriceBreakdownSection.tsx",
      "src/modules/orders/presentation/admin/transaction-detail/TransactionFulfillmentPanels.tsx",
      "src/modules/orders/presentation/admin/transaction-detail/TransactionSidebar.tsx",
      "src/modules/orders/presentation/admin/transaction-detail/SessionActivitySection.tsx",
      "src/modules/orders/presentation/admin/transaction-detail/EmailPreviewModal.tsx",
      "src/modules/orders/presentation/admin/transaction-detail/PaymentEventDrawer.tsx",
    ];

    for (const modulePath of modulePaths) {
      expect(read(modulePath)).toContain("export function");
    }
  });

  it("keeps the legacy section shell paths as thin shims", () => {
    const legacyPaths = [
      "src/components/admin/transactions/order-details/TransactionHeaderActions.tsx",
      "src/components/admin/transactions/order-details/TransactionPriceBreakdownSection.tsx",
      "src/components/admin/transactions/order-details/TransactionFulfillmentPanels.tsx",
      "src/components/admin/transactions/order-details/TransactionSidebar.tsx",
      "src/components/admin/transactions/order-details/SessionActivitySection.tsx",
      "src/components/admin/transactions/order-details/EmailPreviewModal.tsx",
      "src/components/admin/transactions/order-details/PaymentEventDrawer.tsx",
    ];

    for (const legacyPath of legacyPaths) {
      expect(read(legacyPath)).toContain(
        "@/modules/orders/presentation/admin/transaction-detail/",
      );
    }
  });
});
