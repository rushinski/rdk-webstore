import fs from "node:fs";
import path from "node:path";

describe("admin transaction detail screen module migration structure", () => {
  it("routes the admin transaction detail page through the module boundary", () => {
    const routeSource = fs.readFileSync(
      path.join(process.cwd(), "app/admin/transactions/[orderId]/page.tsx"),
      "utf8",
    );

    expect(routeSource).toContain(
      "@/modules/orders/presentation/admin/transaction-detail",
    );
    expect(routeSource).toContain("<AdminTransactionDetailScreen />");
  });

  it("makes the admin transaction detail screen module-owned", () => {
    const moduleSource = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/modules/orders/presentation/admin/transaction-detail/AdminTransactionDetailScreen.tsx",
      ),
      "utf8",
    );

    expect(moduleSource).toContain("export function AdminTransactionDetailScreen");
    expect(moduleSource).toContain("buildTransactionDetailViewModel({");
  });

  it("removes the legacy admin transaction detail screen duplicate after module migration", () => {
    expect(
      fs.existsSync(
        path.join(
          process.cwd(),
          "src/components/admin/transactions/order-details/AdminTransactionDetailScreen.tsx",
        ),
      ),
    ).toBe(false);
  });
});
