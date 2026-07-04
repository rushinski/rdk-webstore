import fs from "node:fs";
import path from "node:path";

describe("admin customer detail structure", () => {
  it("delegates customer detail loading and derived insight state to a focused hook", () => {
    const source = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/modules/customers/presentation/admin/customer-detail/AdminCustomerDetailScreen.tsx",
      ),
      "utf8",
    );

    expect(source).toContain(
      "@/modules/customers/presentation/admin/customer-detail/useAdminCustomerDetailData",
    );
    expect(source).toContain("useAdminCustomerDetailData(");
  });

  it("delegates customer detail formatting and payment-method display helpers to a focused view module", () => {
    const source = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/modules/customers/presentation/admin/customer-detail/AdminCustomerDetailScreen.tsx",
      ),
      "utf8",
    );
    const paymentsSource = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/modules/customers/presentation/admin/customer-detail/CustomerPaymentsSection.tsx",
      ),
      "utf8",
    );
    const methodsSource = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/modules/customers/presentation/admin/customer-detail/CustomerPaymentMethodsSection.tsx",
      ),
      "utf8",
    );

    expect(source).toContain(
      "@/modules/customers/presentation/admin/customer-detail/customerDetailView",
    );
    expect(paymentsSource).toContain("formatCustomerDate(");
    expect(methodsSource).toContain("buildPaymentMethodDetailRows(");
  });
});
