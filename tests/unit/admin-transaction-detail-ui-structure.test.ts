import fs from "node:fs";
import path from "node:path";

describe("admin transaction detail ui structure", () => {
  it("delegates local modal and drawer ui state to a focused hook", () => {
    const source = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/modules/orders/presentation/admin/transaction-detail/AdminTransactionDetailScreen.tsx",
      ),
      "utf8",
    );

    expect(source).toContain("@/modules/orders/presentation/admin/transaction-detail");
    expect(source).toContain("useAdminTransactionDetailUi()");
  });

  it("keeps transaction status tone mapping in the focused ui hook module", () => {
    const source = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/modules/orders/presentation/admin/transaction-detail/useAdminTransactionDetailUi.ts",
      ),
      "utf8",
    );

    expect(source).toContain("getTransactionStatusTone");
  });
});
