import fs from "node:fs";
import path from "node:path";

describe("inventory client controller structure", () => {
  it("delegates local inventory state initialization to a focused hook", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/components/admin/inventory/InventoryClient.tsx"),
      "utf8",
    );

    expect(source).toContain("@/components/admin/inventory/useInventoryClientState");
    expect(source).toContain("useInventoryClientState({");
  });

  it("delegates inventory ui event wiring to a focused handler hook", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/components/admin/inventory/InventoryClient.tsx"),
      "utf8",
    );

    expect(source).toContain("@/components/admin/inventory/useInventoryClientHandlers");
    expect(source).toContain("useInventoryClientHandlers({");
  });
});
