export function getInventoryHeaderDescription(
  skuTotalCount: number,
  totalCount: number,
  inventoryUnitTotalCount: number,
): string {
  return `${skuTotalCount} unique SKUs · ${totalCount} total products · ${inventoryUnitTotalCount} total inventory units`;
}

export function getInventoryExportFileName(dateLike = new Date().toISOString()): string {
  const today = dateLike.slice(0, 10);
  return `inventory-${today}.csv`;
}
