import fs from "node:fs";
import path from "node:path";

describe("admin settings route structure", () => {
  it("routes admin profile through the settings module presentation boundary", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "app/admin/profile/page.tsx"),
      "utf8",
    );

    expect(source).toContain("@/modules/settings/presentation/admin/profile");
    expect(source).toContain("<AdminProfilePageContent />");
  });

  it("routes admin tax settings through the settings module presentation boundary", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "app/admin/settings/taxes/page.tsx"),
      "utf8",
    );

    expect(source).toContain("@/modules/settings/presentation/admin/tax");
    expect(source).toContain("<TaxSettingsPageContent />");
  });
});
