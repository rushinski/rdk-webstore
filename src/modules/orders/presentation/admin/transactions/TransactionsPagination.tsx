"use client";

import { buildPaginationWindow } from "@/modules/orders/presentation/admin/transactions/transactionsView";

type TransactionsPaginationProps = {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
};

const paginationButtonStyles =
  "border border-brand-border bg-brand-surface px-3 py-2 text-sm text-brand-text transition hover:bg-brand-page disabled:cursor-not-allowed disabled:text-brand-muted";
const paginationCurrentStyles =
  "border border-brand-text bg-brand-text px-3 py-2 text-sm text-brand-page";

export function TransactionsPagination({
  page,
  totalPages,
  onPageChange,
}: TransactionsPaginationProps) {
  if (totalPages <= 1) {
    return null;
  }

  const { end, pages, start } = buildPaginationWindow(page, totalPages);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => onPageChange(Math.max(1, page - 1))}
        disabled={page === 1}
        className={paginationButtonStyles}
      >
        Previous
      </button>
      {start > 1 ? (
        <button
          type="button"
          onClick={() => onPageChange(1)}
          className={paginationButtonStyles}
        >
          1
        </button>
      ) : null}
      {start > 2 ? <span className="text-brand-muted">...</span> : null}
      {pages.map((nextPage) => (
        <button
          key={nextPage}
          type="button"
          onClick={() => onPageChange(nextPage)}
          className={nextPage === page ? paginationCurrentStyles : paginationButtonStyles}
        >
          {nextPage}
        </button>
      ))}
      {end < totalPages - 1 ? <span className="text-brand-muted">...</span> : null}
      {end < totalPages ? (
        <button
          type="button"
          onClick={() => onPageChange(totalPages)}
          className={paginationButtonStyles}
        >
          {totalPages}
        </button>
      ) : null}
      <button
        type="button"
        onClick={() => onPageChange(Math.min(totalPages, page + 1))}
        disabled={page === totalPages}
        className={paginationButtonStyles}
      >
        Next
      </button>
    </div>
  );
}
