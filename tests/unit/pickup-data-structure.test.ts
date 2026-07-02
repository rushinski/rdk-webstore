import fs from "node:fs";
import path from "node:path";

describe("pickup data structure", () => {
  it("delegates pickup request orchestration to a focused request module", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/components/admin/pickups/useAdminPickupsData.ts"),
      "utf8",
    );

    expect(source).toContain("@/components/admin/pickups/pickupDataRequests");
    expect(source).toContain("loadPickupCountsRequest(");
    expect(source).toContain("loadPickupOrdersRequest(");
    expect(source).toContain("markPickupCompleteRequest(");
  });

  it("keeps pickup orders query construction inside the request module", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/components/admin/pickups/pickupDataRequests.ts"),
      "utf8",
    );

    expect(source).toContain("buildPickupOrdersParams");
    expect(source).toContain("new URLSearchParams");
  });
});
