import fs from "node:fs";
import path from "node:path";

describe("admin customer detail screen structure", () => {
  it("delegates payments, payment methods, activity, and details panels to focused customer detail components", () => {
    const source = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/components/admin/customers/customer-details/AdminCustomerDetailScreen.tsx",
      ),
      "utf8",
    );

    expect(source).toContain(
      "@/components/admin/customers/customer-details/CustomerPaymentsSection",
    );
    expect(source).toContain(
      "@/components/admin/customers/customer-details/CustomerPaymentMethodsSection",
    );
    expect(source).toContain(
      "@/components/admin/customers/customer-details/CustomerActivitySection",
    );
    expect(source).toContain(
      "@/components/admin/customers/customer-details/CustomerDetailsPanel",
    );
  });
});
