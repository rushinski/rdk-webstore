import fs from "node:fs";
import path from "node:path";

describe("shipping data structure", () => {
  it("delegates shipping request building and response loading to a focused request module", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/components/admin/shipping/useAdminShippingData.ts"),
      "utf8",
    );

    expect(source).toContain("./shippingDataRequests");
    expect(source).toContain("loadShippingCountsRequest(");
    expect(source).toContain("loadShippingOrdersRequest(");
  });

  it("keeps shipping orders query construction inside the request module", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/components/admin/shipping/shippingDataRequests.ts"),
      "utf8",
    );

    expect(source).toContain("buildShippingOrdersParams");
    expect(source).toContain("new URLSearchParams");
  });
});
