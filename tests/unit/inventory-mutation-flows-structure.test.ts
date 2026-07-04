import fs from "node:fs";
import path from "node:path";

describe("inventory mutation flows structure", () => {
  it("delegates inventory async mutation workflows to a focused flow module", () => {
    const source = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/modules/catalog/presentation/admin/inventory/useInventoryClientMutations.ts",
      ),
      "utf8",
    );

    expect(source).toContain(
      "@/modules/catalog/presentation/admin/inventory/inventoryMutationFlows",
    );
    expect(source).toContain("confirmInventoryDeleteFlow(");
    expect(source).toContain("confirmInventoryMassDeleteFlow(");
    expect(source).toContain("confirmInventoryArchiveFlow(");
    expect(source).toContain("confirmInventoryRestoreFlow(");
  });
});
