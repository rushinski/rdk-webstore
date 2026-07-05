import fs from "node:fs";
import path from "node:path";

describe("admin shipping settings structure", () => {
  it("delegates shipping settings loading and save workflows to a focused hook", () => {
    const source = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/modules/settings/presentation/admin/shipping/AdminShippingSettingsScreen.tsx",
      ),
      "utf8",
    );

    expect(source).toContain(
      "@/modules/settings/presentation/admin/shipping/useAdminShippingSettingsData",
    );
    expect(source).toContain("useAdminShippingSettingsData()");
  });

  it("delegates shipping package display helpers to a focused view module", () => {
    const screenSource = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/modules/settings/presentation/admin/shipping/AdminShippingSettingsScreen.tsx",
      ),
      "utf8",
    );
    const cardSource = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/modules/settings/presentation/admin/shipping/ShippingPackageDefaultsCard.tsx",
      ),
      "utf8",
    );

    expect(screenSource).toContain(
      "@/modules/settings/presentation/admin/shipping/ShippingPackageDefaultsCard",
    );
    expect(cardSource).toContain(
      "@/modules/settings/presentation/admin/shipping/shippingSettingsView",
    );
    expect(cardSource).toContain("buildShippingPackageSummary(");
  });
});
