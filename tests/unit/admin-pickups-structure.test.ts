import fs from "node:fs";
import path from "node:path";

describe("admin pickups structure", () => {
  it("delegates pickup queue loading and status mutation workflows to a focused hook", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/components/admin/pickups/AdminPickupsScreen.tsx"),
      "utf8",
    );

    expect(source).toContain("@/components/admin/pickups/useAdminPickupsData");
    expect(source).toContain("useAdminPickupsData()");
  });

  it("delegates pickup summary, filtering, and display helpers to a focused view module", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/components/admin/pickups/AdminPickupsScreen.tsx"),
      "utf8",
    );
    const paginationSource = fs.readFileSync(
      path.join(process.cwd(), "src/components/admin/pickups/PickupsPagination.tsx"),
      "utf8",
    );

    expect(source).toContain("@/components/admin/pickups/pickupsView");
    expect(source).toContain("buildPickupSummary(");
    expect(source).toContain("buildFilteredPickupOrders(");
    expect(paginationSource).toContain("buildPickupPaginationWindow(");
  });
});
