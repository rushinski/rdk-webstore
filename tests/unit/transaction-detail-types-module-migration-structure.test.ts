import fs from "node:fs";
import path from "node:path";

describe("transaction detail types module migration structure", () => {
  it("makes transaction detail types module-owned", () => {
    const typesSource = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/modules/orders/presentation/admin/transaction-detail/types.ts",
      ),
      "utf8",
    );

    expect(typesSource).toContain("export type TransactionPayload");
    expect(typesSource).toContain("export type Order");
    expect(typesSource).toContain("export type SessionEntry");
  });

  it("removes the legacy transaction detail types duplicate after module migration", () => {
    expect(
      fs.existsSync(
        path.join(
          process.cwd(),
          "src/components/admin/transactions/order-details/types.ts",
        ),
      ),
    ).toBe(false);
  });
});
