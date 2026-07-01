import fs from "node:fs";
import path from "node:path";

describe("admin customer detail structure", () => {
  it("delegates customer detail loading and derived insight state to a focused hook", () => {
    const source = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/components/admin/customers/customer-details/AdminCustomerDetailScreen.tsx",
      ),
      "utf8",
    );

    expect(source).toContain(
      "@/components/admin/customers/customer-details/useAdminCustomerDetailData",
    );
    expect(source).toContain("useAdminCustomerDetailData(");
  });

  it("delegates customer detail formatting and payment-method display helpers to a focused view module", () => {
    const source = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/components/admin/customers/customer-details/AdminCustomerDetailScreen.tsx",
      ),
      "utf8",
    );

    expect(source).toContain(
      "@/components/admin/customers/customer-details/customerDetailView",
    );
    expect(source).toContain("formatCustomerDate(");
    expect(source).toContain("buildPaymentMethodDetailRows(");
  });
});
