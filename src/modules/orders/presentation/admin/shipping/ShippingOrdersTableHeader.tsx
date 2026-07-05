"use client";

const tableHeaderCellStyles =
  "sticky top-0 z-10 bg-brand-page p-3 text-left font-semibold text-brand-muted sm:p-4";

export function ShippingOrdersTableHeader() {
  return (
    <thead>
      <tr className="bg-brand-page">
        <th className={tableHeaderCellStyles}>Placed At</th>
        <th className={tableHeaderCellStyles}>Order</th>
        <th className={`hidden md:table-cell ${tableHeaderCellStyles}`}>Customer</th>
        <th className={`hidden md:table-cell ${tableHeaderCellStyles}`}>Destination</th>
        <th className={`hidden md:table-cell ${tableHeaderCellStyles}`}>Tracking</th>
        <th className={`hidden md:table-cell ${tableHeaderCellStyles}`}>Label</th>
        <th className={`${tableHeaderCellStyles} md:text-right`}>
          <span className="hidden md:inline">Items</span>
          <span className="md:hidden">Actions</span>
        </th>
        <th className={`hidden text-right md:table-cell ${tableHeaderCellStyles}`}>
          Action
        </th>
      </tr>
    </thead>
  );
}
