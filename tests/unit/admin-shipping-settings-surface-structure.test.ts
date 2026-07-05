import fs from "node:fs";
import path from "node:path";

describe("admin shipping settings surface structure", () => {
  it("delegates origin, carriers, and package-default cards to focused components", () => {
    const source = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/modules/settings/presentation/admin/shipping/AdminShippingSettingsScreen.tsx",
      ),
      "utf8",
    );

    expect(source).toContain(
      "@/modules/settings/presentation/admin/shipping/ShippingOriginSettingsCard",
    );
    expect(source).toContain(
      "@/modules/settings/presentation/admin/shipping/ShippingCarriersSettingsCard",
    );
    expect(source).toContain(
      "@/modules/settings/presentation/admin/shipping/ShippingPackageDefaultsCard",
    );
    expect(source).toContain("<ShippingOriginSettingsCard");
    expect(source).toContain("<ShippingCarriersSettingsCard");
    expect(source).toContain("<ShippingPackageDefaultsCard");
  });
});
