import fs from "node:fs";
import path from "node:path";

describe("create label requests structure", () => {
  it("delegates create-label network requests to a focused request module", () => {
    const source = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/modules/orders/presentation/admin/shipping/useCreateLabelFormMutations.ts",
      ),
      "utf8",
    );
    const requestSource = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/modules/orders/presentation/admin/shipping/createLabelFormRequests.ts",
      ),
      "utf8",
    );

    expect(source).toContain(
      "@/modules/orders/presentation/admin/shipping/createLabelFormRequests",
    );
    expect(requestSource).toContain("fetchLabelRatesRequest");
    expect(requestSource).toContain("purchaseShippingLabelRequest");
  });
});
