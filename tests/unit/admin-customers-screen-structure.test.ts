import fs from "node:fs";
import path from "node:path";

describe("admin customers screen structure", () => {
  it("keeps the route page thin by delegating to a focused screen component", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "app/admin/customers/page.tsx"),
      "utf8",
    );

    expect(source).toContain("@/components/admin/customers/AdminCustomersScreen");
    expect(source).toContain("<AdminCustomersScreen />");
  });

  it("delegates customer loading and search helpers to focused modules", () => {
    const screenSource = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/components/admin/customers/AdminCustomersScreen.tsx",
      ),
      "utf8",
    );

    expect(screenSource).toContain(
      "@/components/admin/customers/useAdminCustomersData",
    );
    expect(screenSource).toContain("@/components/admin/customers/customersView");
    expect(screenSource).toContain("buildFilteredCustomers(");
    expect(screenSource).toContain("getCustomerTypeMeta(");
  });
});
