import fs from "node:fs";
import path from "node:path";

describe("admin customer detail screen structure", () => {
  it("delegates payments, payment methods, activity, and details panels to focused customer detail components", () => {
    const source = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/modules/customers/presentation/admin/customer-detail/AdminCustomerDetailScreen.tsx",
      ),
      "utf8",
    );

    expect(source).toContain(
      "@/modules/customers/presentation/admin/customer-detail/CustomerPaymentsSection",
    );
    expect(source).toContain(
      "@/modules/customers/presentation/admin/customer-detail/CustomerPaymentMethodsSection",
    );
    expect(source).toContain(
      "@/modules/customers/presentation/admin/customer-detail/CustomerActivitySection",
    );
    expect(source).toContain(
      "@/modules/customers/presentation/admin/customer-detail/CustomerDetailsPanel",
    );
  });
});
