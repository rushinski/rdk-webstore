import fs from "node:fs";
import path from "node:path";

describe("admin shipping settings surface structure", () => {
  it("delegates origin, carriers, and package-default cards to focused components", () => {
    const source = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/components/admin/settings/shipping/AdminShippingSettingsScreen.tsx",
      ),
      "utf8",
    );

    expect(source).toContain(
      "@/components/admin/settings/shipping/ShippingOriginSettingsCard",
    );
    expect(source).toContain(
      "@/components/admin/settings/shipping/ShippingCarriersSettingsCard",
    );
    expect(source).toContain(
      "@/components/admin/settings/shipping/ShippingPackageDefaultsCard",
    );
    expect(source).toContain("<ShippingOriginSettingsCard");
    expect(source).toContain("<ShippingCarriersSettingsCard");
    expect(source).toContain("<ShippingPackageDefaultsCard");
  });
});
