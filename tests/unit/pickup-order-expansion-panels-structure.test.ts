import fs from "node:fs";
import path from "node:path";

describe("pickup order expansion panels structure", () => {
  it("delegates desktop item rows and mobile detail rows to focused child components", () => {
    const source = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/modules/orders/presentation/admin/pickups/PickupOrderExpansionPanels.tsx",
      ),
      "utf8",
    );

    expect(source).toContain("@/modules/orders/presentation/admin/pickups/PickupExpandedItemsRow");
    expect(source).toContain("@/modules/orders/presentation/admin/pickups/PickupMobileDetailsRow");
    expect(source).toContain("@/modules/orders/presentation/admin/pickups/pickupOrderExpansionTypes");
  });

  it("keeps pickup item formatting in the shared pickup orders table view helper", () => {
    const desktopSource = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/modules/orders/presentation/admin/pickups/PickupExpandedItemsRow.tsx",
      ),
      "utf8",
    );
    const mobileSource = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/modules/orders/presentation/admin/pickups/PickupMobileDetailsRow.tsx",
      ),
      "utf8",
    );

    expect(desktopSource).toContain("buildPickupOrderItemModel(");
    expect(mobileSource).toContain("buildPickupOrderItemModel(");
  });
});
