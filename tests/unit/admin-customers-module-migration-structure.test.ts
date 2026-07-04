import fs from "node:fs";
import path from "node:path";

const read = (relativePath: string) =>
  fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");

describe("admin customers module migration structure", () => {
  it("makes the admin customers listing and detail surfaces module-owned", () => {
    const modulePaths = [
      "src/modules/customers/presentation/admin/AdminCustomersScreen.tsx",
      "src/modules/customers/presentation/admin/useAdminCustomersData.ts",
      "src/modules/customers/presentation/admin/customersView.ts",
      "src/modules/customers/presentation/admin/customer-detail/AdminCustomerDetailScreen.tsx",
      "src/modules/customers/presentation/admin/customer-detail/useAdminCustomerDetailData.ts",
      "src/modules/customers/presentation/admin/customer-detail/customerDetailView.ts",
      "src/modules/customers/presentation/admin/customer-detail/CustomerPaymentsSection.tsx",
      "src/modules/customers/presentation/admin/customer-detail/CustomerPaymentMethodsSection.tsx",
      "src/modules/customers/presentation/admin/customer-detail/CustomerActivitySection.tsx",
      "src/modules/customers/presentation/admin/customer-detail/CustomerDetailsPanel.tsx",
      "src/modules/customers/presentation/admin/customer-detail/CustomerDetailRow.tsx",
    ];

    for (const modulePath of modulePaths) {
      expect(read(modulePath)).toContain("export ");
    }
  });

  it("keeps legacy admin customer paths as thin shims", () => {
    const legacyPaths = [
      "src/components/admin/customers/AdminCustomersScreen.tsx",
      "src/components/admin/customers/useAdminCustomersData.ts",
      "src/components/admin/customers/customersView.ts",
      "src/components/admin/customers/customer-details/AdminCustomerDetailScreen.tsx",
      "src/components/admin/customers/customer-details/useAdminCustomerDetailData.ts",
      "src/components/admin/customers/customer-details/customerDetailView.ts",
      "src/components/admin/customers/customer-details/CustomerPaymentsSection.tsx",
      "src/components/admin/customers/customer-details/CustomerPaymentMethodsSection.tsx",
      "src/components/admin/customers/customer-details/CustomerActivitySection.tsx",
      "src/components/admin/customers/customer-details/CustomerDetailsPanel.tsx",
      "src/components/admin/customers/customer-details/CustomerDetailRow.tsx",
    ];

    for (const legacyPath of legacyPaths) {
      expect(read(legacyPath)).toContain("@/modules/customers/presentation/admin/");
    }
  });
});
