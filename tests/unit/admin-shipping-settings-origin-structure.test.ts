import fs from "node:fs";
import path from "node:path";

describe("admin shipping settings origin structure", () => {
  it("delegates origin modal draft state to a focused hook", () => {
    const source = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/modules/settings/presentation/admin/shipping/useAdminShippingSettingsData.ts",
      ),
      "utf8",
    );

    expect(source).toContain(
      "@/modules/settings/presentation/admin/shipping/useShippingOriginModalState",
    );
    expect(source).toContain("useShippingOriginModalState(");
  });
});
