import fs from "node:fs";
import path from "node:path";

const read = (relativePath: string) =>
  fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");

describe("admin pickups module migration structure", () => {
  it("makes the admin pickups surface module-owned", () => {
    const modulePaths = [
      "src/modules/orders/presentation/admin/pickups/AdminPickupsScreen.tsx",
      "src/modules/orders/presentation/admin/pickups/useAdminPickupsData.ts",
      "src/modules/orders/presentation/admin/pickups/useAdminPickupsScreenUi.ts",
      "src/modules/orders/presentation/admin/pickups/pickupDataRequests.ts",
      "src/modules/orders/presentation/admin/pickups/pickupsView.ts",
      "src/modules/orders/presentation/admin/pickups/pickupTypes.ts",
      "src/modules/orders/presentation/admin/pickups/PickupOrdersTable.tsx",
      "src/modules/orders/presentation/admin/pickups/PickupOrdersTableRow.tsx",
      "src/modules/orders/presentation/admin/pickups/PickupOrdersTableHeader.tsx",
      "src/modules/orders/presentation/admin/pickups/PickupOrderExpansionPanels.tsx",
      "src/modules/orders/presentation/admin/pickups/PickupExpandedItemsRow.tsx",
      "src/modules/orders/presentation/admin/pickups/PickupMobileDetailsRow.tsx",
      "src/modules/orders/presentation/admin/pickups/pickupOrderExpansionTypes.ts",
      "src/modules/orders/presentation/admin/pickups/pickupOrdersTableTypes.ts",
      "src/modules/orders/presentation/admin/pickups/pickupOrdersTableView.ts",
      "src/modules/orders/presentation/admin/pickups/PickupsSummaryCards.tsx",
      "src/modules/orders/presentation/admin/pickups/PickupsTabBar.tsx",
      "src/modules/orders/presentation/admin/pickups/PickupsSearchBar.tsx",
      "src/modules/orders/presentation/admin/pickups/PickupsPagination.tsx",
      "src/modules/orders/presentation/admin/pickups/PickupsFeedback.tsx",
    ];

    for (const modulePath of modulePaths) {
      expect(read(modulePath)).toContain("export ");
    }
  });

  it("keeps legacy pickups paths as thin shims", () => {
    const legacyPaths = [
      "src/components/admin/pickups/AdminPickupsScreen.tsx",
      "src/components/admin/pickups/useAdminPickupsData.ts",
      "src/components/admin/pickups/useAdminPickupsScreenUi.ts",
      "src/components/admin/pickups/pickupDataRequests.ts",
      "src/components/admin/pickups/pickupsView.ts",
      "src/components/admin/pickups/pickupTypes.ts",
      "src/components/admin/pickups/PickupOrdersTable.tsx",
      "src/components/admin/pickups/PickupOrdersTableRow.tsx",
      "src/components/admin/pickups/PickupOrdersTableHeader.tsx",
      "src/components/admin/pickups/PickupOrderExpansionPanels.tsx",
      "src/components/admin/pickups/PickupExpandedItemsRow.tsx",
      "src/components/admin/pickups/PickupMobileDetailsRow.tsx",
      "src/components/admin/pickups/pickupOrderExpansionTypes.ts",
      "src/components/admin/pickups/pickupOrdersTableTypes.ts",
      "src/components/admin/pickups/pickupOrdersTableView.ts",
      "src/components/admin/pickups/PickupsSummaryCards.tsx",
      "src/components/admin/pickups/PickupsTabBar.tsx",
      "src/components/admin/pickups/PickupsSearchBar.tsx",
      "src/components/admin/pickups/PickupsPagination.tsx",
      "src/components/admin/pickups/PickupsFeedback.tsx",
    ];

    for (const legacyPath of legacyPaths) {
      expect(read(legacyPath)).toContain("@/modules/orders/presentation/admin/pickups/");
    }
  });
});
