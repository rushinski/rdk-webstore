import fs from "node:fs";
import path from "node:path";

describe("inventory mutation requests structure", () => {
  it("delegates inventory mutation request execution to a focused request module", () => {
    const source = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/modules/catalog/presentation/admin/inventory/useInventoryClientMutations.ts",
      ),
      "utf8",
    );

    expect(source).toContain(
      "@/modules/catalog/presentation/admin/inventory/inventoryMutationRequests",
    );
    expect(source).toContain("deleteInventoryItemRequest(");
    expect(source).toContain("archiveInventorySelectionRequest(");
  });

  it("keeps inventory mutation fetch wrappers in the request module", () => {
    const source = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/modules/catalog/presentation/admin/inventory/inventoryMutationRequests.ts",
      ),
      "utf8",
    );

    expect(source).toContain("buildInventoryItemActionUrl");
    expect(source).toContain("buildInventoryBulkMutationRequest");
  });
});
