import fs from "node:fs";
import path from "node:path";

describe("admin shipping settings structure", () => {
  it("delegates shipping settings loading and save workflows to a focused hook", () => {
    const source = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/components/admin/settings/shipping/AdminShippingSettingsScreen.tsx",
      ),
      "utf8",
    );

    expect(source).toContain(
      "@/components/admin/settings/shipping/useAdminShippingSettingsData",
    );
    expect(source).toContain("useAdminShippingSettingsData()");
  });

  it("delegates shipping package display helpers to a focused view module", () => {
    const source = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/components/admin/settings/shipping/AdminShippingSettingsScreen.tsx",
      ),
      "utf8",
    );

    expect(source).toContain("@/components/admin/settings/shipping/shippingSettingsView");
    expect(source).toContain("buildShippingPackageSummary(");
  });
});
