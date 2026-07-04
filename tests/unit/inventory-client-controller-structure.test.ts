import fs from "node:fs";
import path from "node:path";

describe("inventory client controller structure", () => {
  it("delegates inventory orchestration to a focused controller hook", () => {
    const source = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/modules/catalog/presentation/admin/inventory/InventoryClient.tsx",
      ),
      "utf8",
    );

    expect(source).toContain(
      "@/modules/catalog/presentation/admin/inventory/useInventoryClientController",
    );
    expect(source).toContain("useInventoryClientController({");
  });

  it("keeps the controller hook responsible for state, effects, handlers, and mutations", () => {
    const source = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/modules/catalog/presentation/admin/inventory/useInventoryClientController.ts",
      ),
      "utf8",
    );

    expect(source).toContain(
      "@/modules/catalog/presentation/admin/inventory/useInventoryClientState",
    );
    expect(source).toContain(
      "@/modules/catalog/presentation/admin/inventory/useInventoryClientData",
    );
    expect(source).toContain(
      "@/modules/catalog/presentation/admin/inventory/useInventoryClientEffects",
    );
    expect(source).toContain(
      "@/modules/catalog/presentation/admin/inventory/useInventoryClientHandlers",
    );
    expect(source).toContain(
      "@/modules/catalog/presentation/admin/inventory/useInventoryClientMutations",
    );
  });
});
