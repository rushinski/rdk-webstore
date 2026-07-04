import fs from "node:fs";
import path from "node:path";

describe("home office address form structure", () => {
  it("delegates copy and field update wiring to a focused view helper", () => {
    const source = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/modules/nexus/presentation/admin/HomeOfficeAddressForm.tsx",
      ),
      "utf8",
    );

    expect(source).toContain(
      "@/modules/nexus/presentation/admin/homeOfficeAddressFormView",
    );
    expect(source).toContain("getHomeOfficeAddressFormTitle(");
    expect(source).toContain("getHomeOfficeAddressFormDescription(");
    expect(source).toContain("getHomeOfficeAddressFormNote(");
    expect(source).toContain("updateHomeOfficeFormData(");
  });
});
