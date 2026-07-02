import fs from "node:fs";
import path from "node:path";

describe("admin transaction detail structure", () => {
  it("delegates transaction loading and refresh orchestration to a focused hook", () => {
    const source = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/components/admin/transactions/order-details/AdminTransactionDetailScreen.tsx",
      ),
      "utf8",
    );

    expect(source).toContain(
      "@/components/admin/transactions/order-details/useAdminTransactionDetailData",
    );
    expect(source).toContain("useAdminTransactionDetailData({");
  });

  it("delegates transaction refund and email action workflows to a focused hook", () => {
    const source = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/components/admin/transactions/order-details/AdminTransactionDetailScreen.tsx",
      ),
      "utf8",
    );

    expect(source).toContain(
      "@/components/admin/transactions/order-details/useAdminTransactionDetailMutations",
    );
    expect(source).toContain("useAdminTransactionDetailMutations({");
  });

  it("delegates transaction helper and derived presentation logic to a focused module", () => {
    const source = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/components/admin/transactions/order-details/AdminTransactionDetailScreen.tsx",
      ),
      "utf8",
    );

    expect(source).toContain(
      "@/components/admin/transactions/order-details/transactionDetailView",
    );
    expect(source).toContain("buildTransactionDetailViewModel({");
  });

  it("delegates transaction header status and refund actions to a focused component", () => {
    const source = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/components/admin/transactions/order-details/AdminTransactionDetailScreen.tsx",
      ),
      "utf8",
    );

    expect(source).toContain("./TransactionHeaderActions");
    expect(source).toContain("<TransactionHeaderActions");
  });
});
