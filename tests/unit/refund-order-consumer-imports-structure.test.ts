import fs from "node:fs";
import path from "node:path";

const read = (relativePath: string) =>
  fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");

describe("refund order consumer imports", () => {
  it("points refund-adjacent consumers at the module entrypoint instead of legacy shims", () => {
    const refundProductSelectionPanel = read(
      "src/components/admin/orders/RefundProductSelectionPanel.tsx",
    );
    const refundModeTabs = read("src/components/admin/orders/RefundModeTabs.tsx");
    const refundCustomAmountPanel = read(
      "src/components/admin/orders/RefundCustomAmountPanel.tsx",
    );
    const transactionHeaderActions = read(
      "src/modules/orders/presentation/admin/transaction-detail/TransactionHeaderActions.tsx",
    );
    const transactionDetailMutations = read(
      "src/modules/orders/presentation/admin/transaction-detail/useAdminTransactionDetailMutations.ts",
    );

    expect(refundProductSelectionPanel).toContain(
      "@/modules/orders/presentation/admin/refund-order",
    );
    expect(refundModeTabs).toContain("@/modules/orders/presentation/admin/refund-order");
    expect(refundCustomAmountPanel).toContain(
      "@/modules/orders/presentation/admin/refund-order",
    );
    expect(transactionHeaderActions).toContain(
      "@/modules/orders/presentation/admin/refund-order",
    );
    expect(transactionDetailMutations).toContain(
      "@/modules/orders/presentation/admin/refund-order",
    );
  });
});
