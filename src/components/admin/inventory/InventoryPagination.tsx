"use client";

const paginationButtonStyles =
  "border border-brand-border bg-brand-surface px-3 py-2 text-sm text-brand-text transition hover:bg-brand-page disabled:cursor-not-allowed disabled:text-brand-muted";
const paginationCurrentStyles =
  "border border-brand-text bg-brand-text px-3 py-2 text-sm text-brand-page";

interface InventoryPaginationProps {
  page: number;
  totalPages: number;
  totalCount: number;
  showingStart: number;
  showingEnd: number;
  isLoading: boolean;
  onPageChange: (page: number) => void;
}

export function InventoryPagination({
  page,
  totalPages,
  totalCount,
  showingStart,
  showingEnd,
  isLoading,
  onPageChange,
}: InventoryPaginationProps) {
  if (totalPages <= 1) {
    return null;
  }

  const pages: number[] = [];
  const start = Math.max(1, page - 2);
  const end = Math.min(totalPages, page + 2);

  for (let nextPage = start; nextPage <= end; nextPage += 1) {
    pages.push(nextPage);
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="text-sm text-brand-muted">
        Showing products {showingStart}-{showingEnd} of {totalCount}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page === 1 || isLoading}
          className={paginationButtonStyles}
        >
          Previous
        </button>

        {start > 1 && (
          <button
            type="button"
            onClick={() => onPageChange(1)}
            className={paginationButtonStyles}
          >
            1
          </button>
        )}
        {start > 2 && <span className="text-brand-muted">...</span>}

        {pages.map((nextPage) => (
          <button
            key={nextPage}
            type="button"
            onClick={() => onPageChange(nextPage)}
            className={
              nextPage === page ? paginationCurrentStyles : paginationButtonStyles
            }
          >
            {nextPage}
          </button>
        ))}

        {end < totalPages - 1 && <span className="text-brand-muted">...</span>}
        {end < totalPages && (
          <button
            type="button"
            onClick={() => onPageChange(totalPages)}
            className={paginationButtonStyles}
          >
            {totalPages}
          </button>
        )}

        <button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page === totalPages || isLoading}
          className={paginationButtonStyles}
        >
          Next
        </button>
      </div>
    </div>
  );
}
