import {
  getInventoryListResetState,
  getInventoryLoadDebounceMs,
  getInventoryRealtimeRefreshDelayMs,
  getNextInventoryPage,
  shouldCloseInventoryMenu,
} from "@/components/admin/inventory/inventoryClientLifecycle";

describe("inventoryClientLifecycle", () => {
  it("resets selection and expanded state together", () => {
    expect(getInventoryListResetState()).toEqual({
      selectedIds: [],
      selectAllMatching: false,
      expandedVariants: {},
    });
  });

  it("clamps the page to the current total pages", () => {
    expect(getNextInventoryPage({ page: 5, totalPages: 3 })).toBe(3);
    expect(getNextInventoryPage({ page: 2, totalPages: 3 })).toBeNull();
  });

  it("keeps the menu open when clicking inside an active menu", () => {
    const target = {} as HTMLElement;
    const menus = [{ contains: (node: unknown) => node === target }];

    expect(
      shouldCloseInventoryMenu({
        openMenuId: "product-1",
        target,
        activeMenus: menus,
      }),
    ).toBe(false);
  });

  it("closes the menu when clicking outside active menus", () => {
    expect(
      shouldCloseInventoryMenu({
        openMenuId: "product-1",
        target: {} as HTMLElement,
        activeMenus: [{ contains: () => false }],
      }),
    ).toBe(true);
  });

  it("exposes stable debounce timings", () => {
    expect(getInventoryLoadDebounceMs()).toBe(250);
    expect(getInventoryRealtimeRefreshDelayMs()).toBe(300);
  });
});
