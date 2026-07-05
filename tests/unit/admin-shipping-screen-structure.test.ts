import fs from "node:fs";
import path from "node:path";

describe("admin shipping screen structure", () => {
  it("routes the admin shipping page through the shipping module boundary", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "app/admin/shipping/page.tsx"),
      "utf8",
    );

    expect(source).toContain("@/modules/orders/presentation/admin/shipping");
    expect(source).toContain("<AdminShippingScreen />");
  });

  it("delegates shipping page constants and origin validation rules to a focused view helper", () => {
    const source = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/modules/orders/presentation/admin/shipping/AdminShippingScreen.tsx",
      ),
      "utf8",
    );
    const viewSource = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/modules/orders/presentation/admin/shipping/adminShippingScreenView.ts",
      ),
      "utf8",
    );

    expect(source).toContain("@/modules/orders/presentation/admin/shipping/adminShippingScreenView");
    expect(viewSource).toContain("SHIPPING_TABS");
    expect(viewSource).toContain("validateShippingOrigin");
    expect(viewSource).toContain("extractShippingOriginErrors");
  });

  it("delegates the ready-state alert, origin bar, and dialog stack to focused components", () => {
    const source = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/modules/orders/presentation/admin/shipping/AdminShippingScreen.tsx",
      ),
      "utf8",
    );

    expect(source).toContain(
      "@/modules/orders/presentation/admin/shipping/ShippingReadyAlert",
    );
    expect(source).toContain(
      "@/modules/orders/presentation/admin/shipping/ShippingOriginBar",
    );
    expect(source).toContain(
      "@/modules/orders/presentation/admin/shipping/ShippingDialogs",
    );
  });
});
