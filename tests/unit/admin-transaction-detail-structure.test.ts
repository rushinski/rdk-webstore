import fs from "node:fs";
import path from "node:path";

describe("admin transaction detail structure", () => {
  it("delegates transaction loading and refresh orchestration to a focused hook", () => {
    const source = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/modules/orders/presentation/admin/transaction-detail/AdminTransactionDetailScreen.tsx",
      ),
      "utf8",
    );

    expect(source).toContain("@/modules/orders/presentation/admin/transaction-detail");
    expect(source).toContain("useAdminTransactionDetailData({");
  });

  it("delegates transaction refund and email action workflows to a focused hook", () => {
    const source = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/modules/orders/presentation/admin/transaction-detail/AdminTransactionDetailScreen.tsx",
      ),
      "utf8",
    );

    expect(source).toContain("@/modules/orders/presentation/admin/transaction-detail");
    expect(source).toContain("useAdminTransactionDetailMutations({");
  });

  it("delegates transaction helper and derived presentation logic to a focused module", () => {
    const source = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/modules/orders/presentation/admin/transaction-detail/AdminTransactionDetailScreen.tsx",
      ),
      "utf8",
    );

    expect(source).toContain("@/modules/orders/presentation/admin/transaction-detail");
    expect(source).toContain("buildTransactionDetailViewModel({");
  });

  it("delegates transaction header status and refund actions to a focused component", () => {
    const source = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/modules/orders/presentation/admin/transaction-detail/AdminTransactionDetailScreen.tsx",
      ),
      "utf8",
    );

    expect(source).toContain("@/modules/orders/presentation/admin/transaction-detail");
    expect(source).toContain("<TransactionHeaderActions");
  });
});
