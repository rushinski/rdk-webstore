import fs from "node:fs";
import path from "node:path";

describe("inventory client controller structure", () => {
  it("delegates inventory orchestration to a focused controller hook", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/components/admin/inventory/InventoryClient.tsx"),
      "utf8",
    );

    expect(source).toContain("@/components/admin/inventory/useInventoryClientController");
    expect(source).toContain("useInventoryClientController({");
  });

  it("keeps the controller hook responsible for state, effects, handlers, and mutations", () => {
    const source = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/components/admin/inventory/useInventoryClientController.ts",
      ),
      "utf8",
    );

    expect(source).toContain("@/components/admin/inventory/useInventoryClientState");
    expect(source).toContain("@/components/admin/inventory/useInventoryClientData");
    expect(source).toContain("@/components/admin/inventory/useInventoryClientEffects");
    expect(source).toContain("@/components/admin/inventory/useInventoryClientHandlers");
    expect(source).toContain("@/components/admin/inventory/useInventoryClientMutations");
  });
});
