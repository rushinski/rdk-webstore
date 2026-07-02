import fs from "node:fs";
import path from "node:path";

describe("admin pickups screen structure", () => {
  it("delegates summary, tabs, search, pagination, and feedback to focused pickup components", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/components/admin/pickups/AdminPickupsScreen.tsx"),
      "utf8",
    );

    expect(source).toContain("@/components/admin/pickups/PickupsSummaryCards");
    expect(source).toContain("@/components/admin/pickups/PickupsTabBar");
    expect(source).toContain("@/components/admin/pickups/PickupsSearchBar");
    expect(source).toContain("@/components/admin/pickups/PickupsPagination");
    expect(source).toContain("@/components/admin/pickups/PickupsFeedback");
  });
});
