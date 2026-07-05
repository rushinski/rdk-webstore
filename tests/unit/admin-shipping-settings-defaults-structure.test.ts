import fs from "node:fs";
import path from "node:path";

describe("admin shipping settings defaults structure", () => {
  it("delegates defaults modal draft state to a focused hook", () => {
    const source = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/modules/settings/presentation/admin/shipping/useAdminShippingSettingsData.ts",
      ),
      "utf8",
    );

    expect(source).toContain(
      "@/modules/settings/presentation/admin/shipping/useShippingDefaultsModalState",
    );
    expect(source).toContain("useShippingDefaultsModalState(");
  });
});
