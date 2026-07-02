import fs from "node:fs";
import path from "node:path";

describe("transaction price breakdown structure", () => {
  it("delegates item list and totals rendering to focused components", () => {
    const source = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/components/admin/transactions/order-details/TransactionPriceBreakdownSection.tsx",
      ),
      "utf8",
    );

    expect(source).toContain("./TransactionPriceBreakdownItemList");
    expect(source).toContain("./TransactionPriceBreakdownTotals");
    expect(source).toContain("<TransactionPriceBreakdownItemList");
    expect(source).toContain("<TransactionPriceBreakdownTotals");
  });

  it("delegates item-card display helpers to a focused view module", () => {
    const source = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/components/admin/transactions/order-details/TransactionPriceBreakdownItemList.tsx",
      ),
      "utf8",
    );

    expect(source).toContain("./transactionPriceBreakdownView");
    expect(source).toContain("buildTransactionPriceBreakdownItemModel");
  });
});
