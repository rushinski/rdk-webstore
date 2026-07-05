import fs from "node:fs";
import path from "node:path";

describe("admin settings route structure", () => {
  it("routes shipping settings through the settings module boundary", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "app/admin/settings/shipping/page.tsx"),
      "utf8",
    );

    expect(source).toContain("@/modules/settings/presentation/admin/shipping");
    expect(source).toContain("<AdminShippingSettingsScreen />");
  });

  it("routes store access settings through the settings module boundary", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "app/admin/settings/store-access/page.tsx"),
      "utf8",
    );

    expect(source).toContain("@/modules/settings/presentation/admin/store-access");
    expect(source).toContain("<StoreAccessSettingsPageContent />");
  });
});
