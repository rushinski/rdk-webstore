import fs from "node:fs";
import path from "node:path";

describe("admin customers screen structure", () => {
  it("keeps the route page thin by delegating to a focused screen component", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "app/admin/customers/page.tsx"),
      "utf8",
    );

    expect(source).toContain("@/modules/customers/presentation/admin");
    expect(source).toContain("<AdminCustomersScreen />");
  });

  it("delegates customer loading and search helpers to focused modules", () => {
    const screenSource = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/modules/customers/presentation/admin/AdminCustomersScreen.tsx",
      ),
      "utf8",
    );

    expect(screenSource).toContain(
      "@/modules/customers/presentation/admin/useAdminCustomersData",
    );
    expect(screenSource).toContain("@/modules/customers/presentation/admin/customersView");
    expect(screenSource).toContain("buildFilteredCustomers(");
    expect(screenSource).toContain("getCustomerTypeMeta(");
  });
});
