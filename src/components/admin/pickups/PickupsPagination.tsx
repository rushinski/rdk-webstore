"use client";

import { buildPickupPaginationWindow } from "@/components/admin/pickups/pickupsView";

const paginationButtonStyles =
  "border border-brand-border bg-brand-surface px-3 py-2 text-sm text-brand-text transition hover:bg-brand-page disabled:cursor-not-allowed disabled:text-brand-muted";
const paginationCurrentStyles =
  "border border-brand-text bg-brand-text px-3 py-2 text-sm text-brand-page";

type PickupsPaginationProps = {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
};

export function PickupsPagination({
  currentPage,
  totalPages,
  onPageChange,
}: PickupsPaginationProps) {
  if (totalPages <= 1) {
    return null;
  }

  const { end, pages, start } = buildPickupPaginationWindow(currentPage, totalPages);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
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

      {pages.map((page) => (
        <button
          key={page}
          type="button"
          onClick={() => onPageChange(page)}
          className={
            page === currentPage ? paginationCurrentStyles : paginationButtonStyles
          }
        >
          {page}
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
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage === totalPages}
        className={paginationButtonStyles}
      >
        Next
      </button>
    </div>
  );
}
