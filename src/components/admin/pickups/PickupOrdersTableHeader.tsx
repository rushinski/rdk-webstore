"use client";

const tableHeaderCellStyles =
  "bg-brand-page p-3 text-left font-semibold text-brand-muted sm:p-4";

export function PickupOrdersTableHeader() {
  return (
    <thead>
      <tr className="border-b border-brand-border bg-brand-page">
        <th className={tableHeaderCellStyles}>Placed At</th>
        <th className={tableHeaderCellStyles}>Order</th>
        <th className={`hidden md:table-cell ${tableHeaderCellStyles}`}>Customer</th>
        <th className={`hidden md:table-cell ${tableHeaderCellStyles}`}>Email</th>
        <th className={`hidden md:table-cell ${tableHeaderCellStyles}`}>Fulfillment</th>
        <th className={`${tableHeaderCellStyles} text-right`}>Amount</th>
        <th className={`hidden text-right md:table-cell ${tableHeaderCellStyles}`}>
          Profit
        </th>
        <th className={`${tableHeaderCellStyles} md:text-right`}>
          <span className="hidden md:inline">Items</span>
          <span className="md:hidden">Details</span>
        </th>
        <th className={`hidden text-center md:table-cell ${tableHeaderCellStyles}`}>
          Complete
        </th>
      </tr>
    </thead>
  );
}
