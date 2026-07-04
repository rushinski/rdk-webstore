export function getInventoryListResetState() {
  return {
    selectedIds: [],
    selectAllMatching: false,
    expandedVariants: {},
  };
}

export function getNextInventoryPage({
  page,
  totalPages,
}: {
  page: number;
  totalPages: number;
}): number | null {
  return page > totalPages ? totalPages : null;
}

export function shouldCloseInventoryMenu({
  openMenuId,
  target,
  activeMenus,
}: {
  openMenuId: string | null;
  target: HTMLElement | null;
  activeMenus: Array<{ contains: (node: Node | null) => boolean }>;
}): boolean {
  if (!openMenuId) {
    return false;
  }

  if (target && activeMenus.some((menu) => menu.contains(target))) {
    return false;
  }

  return true;
}

export function getInventoryLoadDebounceMs(): number {
  return 250;
}

export function getInventoryRealtimeRefreshDelayMs(): number {
  return 300;
}
