import fs from "node:fs";
import path from "node:path";

describe("admin shipping screen structure", () => {
  it("delegates shipping page constants and origin validation rules to a focused view helper", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/components/admin/shipping/AdminShippingScreen.tsx"),
      "utf8",
    );
    const viewSource = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/components/admin/shipping/adminShippingScreenView.ts",
      ),
      "utf8",
    );

    expect(source).toContain("@/components/admin/shipping/adminShippingScreenView");
    expect(viewSource).toContain("SHIPPING_TABS");
    expect(viewSource).toContain("validateShippingOrigin");
    expect(viewSource).toContain("extractShippingOriginErrors");
  });

  it("delegates the ready-state alert, origin bar, and dialog stack to focused components", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/components/admin/shipping/AdminShippingScreen.tsx"),
      "utf8",
    );

    expect(source).toContain("@/components/admin/shipping/ShippingReadyAlert");
    expect(source).toContain("@/components/admin/shipping/ShippingOriginBar");
    expect(source).toContain("@/components/admin/shipping/ShippingDialogs");
  });
});
