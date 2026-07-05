import fs from "node:fs";
import path from "node:path";

const read = (relativePath: string) =>
  fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");

describe("admin shipping table module migration structure", () => {
  it("makes the shipping table stack module-owned", () => {
    const modulePaths = [
      "src/modules/orders/presentation/admin/shipping/ShippingOrdersTable.tsx",
      "src/modules/orders/presentation/admin/shipping/ShippingOrdersTableHeader.tsx",
      "src/modules/orders/presentation/admin/shipping/ShippingOrdersTableRow.tsx",
      "src/modules/orders/presentation/admin/shipping/ShippingOrderExpansionPanels.tsx",
      "src/modules/orders/presentation/admin/shipping/ShippingExpandedItemsRow.tsx",
      "src/modules/orders/presentation/admin/shipping/ShippingMobileDetailsRow.tsx",
      "src/modules/orders/presentation/admin/shipping/shippingOrdersTableTypes.ts",
      "src/modules/orders/presentation/admin/shipping/shippingOrdersTableView.tsx",
      "src/modules/orders/presentation/admin/shipping/shippingOrderExpansionTypes.ts",
    ];

    for (const modulePath of modulePaths) {
      expect(read(modulePath)).toContain("export ");
    }
  });

  it("keeps legacy shipping table files as thin shims", () => {
    const legacyPaths = [
      "src/components/admin/shipping/ShippingOrdersTable.tsx",
      "src/components/admin/shipping/ShippingOrdersTableHeader.tsx",
      "src/components/admin/shipping/ShippingOrdersTableRow.tsx",
      "src/components/admin/shipping/ShippingOrderExpansionPanels.tsx",
      "src/components/admin/shipping/ShippingExpandedItemsRow.tsx",
      "src/components/admin/shipping/ShippingMobileDetailsRow.tsx",
      "src/components/admin/shipping/shippingOrdersTableTypes.ts",
      "src/components/admin/shipping/shippingOrdersTableView.tsx",
      "src/components/admin/shipping/shippingOrderExpansionTypes.ts",
    ];

    for (const legacyPath of legacyPaths) {
      expect(read(legacyPath)).toContain(
        "@/modules/orders/presentation/admin/shipping/",
      );
    }
  });
});
