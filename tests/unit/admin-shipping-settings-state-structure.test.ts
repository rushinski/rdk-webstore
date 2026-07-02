import fs from "node:fs";
import path from "node:path";

describe("admin shipping settings state structure", () => {
  it("delegates shipping settings draft shaping and carrier toggling to a focused state helper module", () => {
    const source = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/components/admin/settings/shipping/useAdminShippingSettingsData.ts",
      ),
      "utf8",
    );

    expect(source).toContain(
      "@/components/admin/settings/shipping/shippingSettingsState",
    );
    expect(source).toContain("createShippingDefaultsModalState(");
    expect(source).toContain("createClosedShippingDefaultsState()");
    expect(source).toContain("toggleShippingCarrierSelection(");
  });
});
