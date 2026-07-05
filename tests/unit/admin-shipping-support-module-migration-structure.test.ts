import fs from "node:fs";
import path from "node:path";

const read = (relativePath: string) =>
  fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");

describe("admin shipping support module migration structure", () => {
  it("makes screen-level shipping support components module-owned", () => {
    const modulePaths = [
      "src/modules/orders/presentation/admin/shipping/ShippingDialogs.tsx",
      "src/modules/orders/presentation/admin/shipping/ShippingReadyAlert.tsx",
      "src/modules/orders/presentation/admin/shipping/ShippingOriginBar.tsx",
      "src/modules/orders/presentation/admin/shipping/ShippingPagination.tsx",
      "src/modules/orders/presentation/admin/shipping/ShippingTabBar.tsx",
    ];

    for (const modulePath of modulePaths) {
      expect(read(modulePath)).toContain("export ");
    }
  });

  it("keeps legacy screen-level shipping support files as thin shims", () => {
    const legacyPaths = [
      "src/components/admin/shipping/ShippingDialogs.tsx",
      "src/components/admin/shipping/ShippingReadyAlert.tsx",
      "src/components/admin/shipping/ShippingOriginBar.tsx",
      "src/components/admin/shipping/ShippingPagination.tsx",
      "src/components/admin/shipping/ShippingTabBar.tsx",
    ];

    for (const legacyPath of legacyPaths) {
      expect(read(legacyPath)).toContain(
        "@/modules/orders/presentation/admin/shipping/",
      );
    }
  });
});
