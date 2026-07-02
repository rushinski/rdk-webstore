import fs from "node:fs";
import path from "node:path";

describe("admin shipping settings data structure", () => {
  it("delegates shipping settings config and validation helpers to a focused module", () => {
    const source = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/components/admin/settings/shipping/useAdminShippingSettingsData.ts",
      ),
      "utf8",
    );

    expect(source).toContain(
      "@/components/admin/settings/shipping/shippingSettingsConfig",
    );
    expect(source).toContain("validateOriginDraft(");
  });

  it("delegates shipping settings fetch and save requests to a focused request module", () => {
    const source = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/components/admin/settings/shipping/useAdminShippingSettingsData.ts",
      ),
      "utf8",
    );

    expect(source).toContain(
      "@/components/admin/settings/shipping/shippingSettingsRequests",
    );
    expect(source).toContain("loadShippingSettingsData()");
    expect(source).toContain("saveShippingDefaultsRequest(");
  });
});
