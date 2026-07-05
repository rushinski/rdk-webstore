import fs from "node:fs";
import path from "node:path";

describe("admin shipping settings state structure", () => {
  it("delegates shipping settings draft shaping and carrier toggling to a focused state helper module", () => {
    const source = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/modules/settings/presentation/admin/shipping/useAdminShippingSettingsData.ts",
      ),
      "utf8",
    );

    expect(source).toContain(
      "@/modules/settings/presentation/admin/shipping/shippingSettingsState",
    );
    expect(source).toContain("toggleShippingCarrierSelection(");
  });

  it("keeps defaults modal state shaping inside the focused defaults-state hook", () => {
    const source = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/modules/settings/presentation/admin/shipping/useShippingDefaultsModalState.ts",
      ),
      "utf8",
    );

    expect(source).toContain(
      "@/modules/settings/presentation/admin/shipping/shippingSettingsState",
    );
    expect(source).toContain("createShippingDefaultsModalState(");
    expect(source).toContain("createClosedShippingDefaultsState()");
  });
});
