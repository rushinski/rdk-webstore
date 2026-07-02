import fs from "node:fs";
import path from "node:path";

describe("admin shipping settings defaults structure", () => {
  it("delegates defaults modal draft state to a focused hook", () => {
    const source = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/components/admin/settings/shipping/useAdminShippingSettingsData.ts",
      ),
      "utf8",
    );

    expect(source).toContain(
      "@/components/admin/settings/shipping/useShippingDefaultsModalState",
    );
    expect(source).toContain("useShippingDefaultsModalState(");
  });
});
