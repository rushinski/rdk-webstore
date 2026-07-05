import fs from "node:fs";
import path from "node:path";

const read = (relativePath: string) =>
  fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");

describe("admin shipping top-level module migration structure", () => {
  it("makes the admin shipping screen and controller layer module-owned", () => {
    const modulePaths = [
      "src/modules/orders/presentation/admin/shipping/AdminShippingScreen.tsx",
      "src/modules/orders/presentation/admin/shipping/useAdminShippingData.ts",
      "src/modules/orders/presentation/admin/shipping/useAdminShippingMutations.ts",
      "src/modules/orders/presentation/admin/shipping/useAdminShippingScreenUi.ts",
      "src/modules/orders/presentation/admin/shipping/adminShippingScreenView.ts",
      "src/modules/orders/presentation/admin/shipping/shippingDataRequests.ts",
      "src/modules/orders/presentation/admin/shipping/shippingView.ts",
      "src/modules/orders/presentation/admin/shipping/shippingTypes.ts",
    ];

    for (const modulePath of modulePaths) {
      expect(read(modulePath)).toContain("export ");
    }
  });

  it("removes legacy top-level shipping duplicate files after module migration", () => {
    const legacyPaths = [
      "src/components/admin/shipping/AdminShippingScreen.tsx",
      "src/components/admin/shipping/useAdminShippingData.ts",
      "src/components/admin/shipping/useAdminShippingMutations.ts",
      "src/components/admin/shipping/useAdminShippingScreenUi.ts",
      "src/components/admin/shipping/adminShippingScreenView.ts",
      "src/components/admin/shipping/shippingDataRequests.ts",
      "src/components/admin/shipping/shippingView.ts",
      "src/components/admin/shipping/shippingTypes.ts",
    ];

    for (const legacyPath of legacyPaths) {
      expect(fs.existsSync(path.join(process.cwd(), legacyPath))).toBe(false);
    }
  });
});
