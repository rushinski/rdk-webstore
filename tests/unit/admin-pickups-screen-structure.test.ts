import fs from "node:fs";
import path from "node:path";

describe("admin pickups screen structure", () => {
  it("routes the admin pickups page through the pickups module boundary", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "app/admin/pickups/page.tsx"),
      "utf8",
    );

    expect(source).toContain("@/modules/orders/presentation/admin/pickups");
    expect(source).toContain("<AdminPickupsScreen />");
  });

  it("delegates summary, tabs, search, pagination, and feedback to focused pickup components", () => {
    const source = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/modules/orders/presentation/admin/pickups/AdminPickupsScreen.tsx",
      ),
      "utf8",
    );

    expect(source).toContain("@/modules/orders/presentation/admin/pickups/PickupsSummaryCards");
    expect(source).toContain("@/modules/orders/presentation/admin/pickups/PickupsTabBar");
    expect(source).toContain("@/modules/orders/presentation/admin/pickups/PickupsSearchBar");
    expect(source).toContain("@/modules/orders/presentation/admin/pickups/PickupsPagination");
    expect(source).toContain("@/modules/orders/presentation/admin/pickups/PickupsFeedback");
  });
});
