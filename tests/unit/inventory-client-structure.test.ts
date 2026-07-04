import fs from "node:fs";
import path from "node:path";

describe("inventory client structure", () => {
  it("delegates the inventory control surface to a focused toolbar component", () => {
    const source = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/modules/catalog/presentation/admin/inventory/InventoryClient.tsx",
      ),
      "utf8",
    );

    expect(source).toContain(
      "@/modules/catalog/presentation/admin/inventory/InventoryToolbar",
    );
    expect(source).toContain("<InventoryToolbar");
  });

  it("delegates pagination controls to a focused inventory pagination component", () => {
    const source = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/modules/catalog/presentation/admin/inventory/InventoryClient.tsx",
      ),
      "utf8",
    );

    expect(source).toContain(
      "@/modules/catalog/presentation/admin/inventory/InventoryPagination",
    );
    expect(source).toContain("<InventoryPagination");
  });

  it("delegates modal and confirmation rendering to an inventory dialogs component", () => {
    const source = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/modules/catalog/presentation/admin/inventory/InventoryClient.tsx",
      ),
      "utf8",
    );

    expect(source).toContain(
      "@/modules/catalog/presentation/admin/inventory/InventoryDialogs",
    );
    expect(source).toContain("<InventoryDialogs");
  });

  it("delegates inventory query and product-display logic to focused helpers", () => {
    const source = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/modules/catalog/presentation/admin/inventory/useInventoryClientController.ts",
      ),
      "utf8",
    );

    expect(source).toContain(
      "@/modules/catalog/presentation/admin/inventory/inventoryClientData",
    );
  });

  it("delegates inventory selection logic to focused helpers", () => {
    const source = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/modules/catalog/presentation/admin/inventory/useInventoryClientController.ts",
      ),
      "utf8",
    );

    expect(source).toContain(
      "@/modules/catalog/presentation/admin/inventory/inventoryClientSelection",
    );
  });

  it("delegates inventory mutation request and message logic to focused helpers", () => {
    const source = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/modules/catalog/presentation/admin/inventory/useInventoryClientMutations.ts",
      ),
      "utf8",
    );

    expect(source).toContain(
      "@/modules/catalog/presentation/admin/inventory/inventoryClientMutations",
    );
  });

  it("delegates inventory dialog-intent and action gating to focused helpers", () => {
    const source = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/modules/catalog/presentation/admin/inventory/useInventoryClientMutations.ts",
      ),
      "utf8",
    );

    expect(source).toContain(
      "@/modules/catalog/presentation/admin/inventory/inventoryClientActions",
    );
  });

  it("delegates inventory view metadata formatting to focused helpers", () => {
    const source = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/modules/catalog/presentation/admin/inventory/useInventoryClientController.ts",
      ),
      "utf8",
    );

    expect(source).toContain("@/modules/catalog/presentation/admin/inventory/inventoryClientView");
  });

  it("delegates inventory request url and response normalization to focused helpers", () => {
    const source = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/modules/catalog/presentation/admin/inventory/useInventoryClientData.ts",
      ),
      "utf8",
    );

    expect(source).toContain(
      "@/modules/catalog/presentation/admin/inventory/inventoryClientRequests",
    );
  });

  it("delegates inventory derived pagination and filter state to focused helpers", () => {
    const source = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/modules/catalog/presentation/admin/inventory/useInventoryClientController.ts",
      ),
      "utf8",
    );

    expect(source).toContain(
      "@/modules/catalog/presentation/admin/inventory/inventoryClientDerivedState",
    );
  });

  it("delegates inventory lifecycle rules to focused helpers", () => {
    const source = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/modules/catalog/presentation/admin/inventory/useInventoryClientEffects.ts",
      ),
      "utf8",
    );

    expect(source).toContain(
      "@/modules/catalog/presentation/admin/inventory/inventoryClientLifecycle",
    );
  });

  it("delegates inventory realtime subscription metadata to focused helpers", () => {
    const source = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/modules/catalog/presentation/admin/inventory/useInventoryClientEffects.ts",
      ),
      "utf8",
    );

    expect(source).toContain(
      "@/modules/catalog/presentation/admin/inventory/inventoryClientRealtime",
    );
  });

  it("delegates inventory ui-state helpers to a focused module", () => {
    const source = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/modules/catalog/presentation/admin/inventory/useInventoryClientHandlers.ts",
      ),
      "utf8",
    );

    expect(source).toContain(
      "@/modules/catalog/presentation/admin/inventory/inventoryClientUiState",
    );
  });

  it("delegates inventory header actions to a focused component", () => {
    const source = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/modules/catalog/presentation/admin/inventory/InventoryClient.tsx",
      ),
      "utf8",
    );

    expect(source).toContain(
      "@/modules/catalog/presentation/admin/inventory/InventoryClientHeaderActions",
    );
    expect(source).toContain("<InventoryClientHeaderActions");
  });

  it("delegates the inventory loading and list content block to a focused component", () => {
    const source = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/modules/catalog/presentation/admin/inventory/InventoryClient.tsx",
      ),
      "utf8",
    );

    expect(source).toContain(
      "@/modules/catalog/presentation/admin/inventory/InventoryClientContent",
    );
    expect(source).toContain("<InventoryClientContent");
  });

  it("delegates inventory side effects to a focused hook", () => {
    const source = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/modules/catalog/presentation/admin/inventory/useInventoryClientController.ts",
      ),
      "utf8",
    );

    expect(source).toContain(
      "@/modules/catalog/presentation/admin/inventory/useInventoryClientEffects",
    );
    expect(source).toContain("useInventoryClientEffects({");
  });

  it("delegates inventory mutation and confirmation flows to a focused hook", () => {
    const source = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/modules/catalog/presentation/admin/inventory/useInventoryClientController.ts",
      ),
      "utf8",
    );

    expect(source).toContain(
      "@/modules/catalog/presentation/admin/inventory/useInventoryClientMutations",
    );
    expect(source).toContain("useInventoryClientMutations({");
  });

  it("delegates inventory data loading and export orchestration to a focused hook", () => {
    const source = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/modules/catalog/presentation/admin/inventory/useInventoryClientController.ts",
      ),
      "utf8",
    );

    expect(source).toContain(
      "@/modules/catalog/presentation/admin/inventory/useInventoryClientData",
    );
    expect(source).toContain("useInventoryClientData({");
  });
});
