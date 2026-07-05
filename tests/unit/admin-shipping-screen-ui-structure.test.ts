import fs from "node:fs";
import path from "node:path";

describe("admin shipping screen ui structure", () => {
  it("delegates shipping screen local tab and dialog state to a focused hook", () => {
    const source = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/modules/orders/presentation/admin/shipping/AdminShippingScreen.tsx",
      ),
      "utf8",
    );

    expect(source).toContain("@/modules/orders/presentation/admin/shipping/useAdminShippingScreenUi");
    expect(source).toContain("useAdminShippingScreenUi()");
  });

  it("keeps shipping expansion toggles and dialog-default derivation in the ui hook", () => {
    const source = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/modules/orders/presentation/admin/shipping/useAdminShippingScreenUi.ts",
      ),
      "utf8",
    );

    expect(source).toContain("toggleOrderExpansion");
    expect(source).toContain("setExpandedItems");
    expect(source).toContain("setLabelOrder");
  });
});
