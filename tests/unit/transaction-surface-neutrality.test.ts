import fs from "node:fs";
import path from "node:path";

describe("transaction surface neutrality", () => {
  it("removes provider-specific labels from transaction details panels", () => {
    const source = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/components/admin/transactions/order-details/TransactionOrderDetailsPanel.tsx",
      ),
      "utf8",
    );

    expect(source).not.toContain("Payrilla");
    expect(source).not.toContain("NoFraud");
  });
});
