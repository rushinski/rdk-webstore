import fs from "node:fs";
import path from "node:path";

describe("admin pickups screen ui structure", () => {
  it("delegates pickups screen local search and expansion state to a focused hook", () => {
    const source = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/modules/orders/presentation/admin/pickups/AdminPickupsScreen.tsx",
      ),
      "utf8",
    );

    expect(source).toContain("@/modules/orders/presentation/admin/pickups/useAdminPickupsScreenUi");
    expect(source).toContain("useAdminPickupsScreenUi()");
  });

  it("keeps pickup expansion toggles and item detail selection in the ui hook", () => {
    const source = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/modules/orders/presentation/admin/pickups/useAdminPickupsScreenUi.ts",
      ),
      "utf8",
    );

    expect(source).toContain("toggleOrderExpansion");
    expect(source).toContain("openItemDetails");
    expect(source).toContain("setExpandedOrders");
  });
});
