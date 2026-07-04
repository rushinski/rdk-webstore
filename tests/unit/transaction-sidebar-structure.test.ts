import fs from "node:fs";
import path from "node:path";

describe("transaction sidebar structure", () => {
  it("delegates order details and customer blocks to focused components", () => {
    const source = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/modules/orders/presentation/admin/transaction-detail/TransactionSidebar.tsx",
      ),
      "utf8",
    );

    expect(source).toContain("TransactionOrderDetailsPanel");
    expect(source).toContain("TransactionCustomerPanel");
    expect(source).toContain("<TransactionOrderDetailsPanel");
    expect(source).toContain("<TransactionCustomerPanel");
  });
});
