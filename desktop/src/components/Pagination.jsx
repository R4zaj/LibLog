import { useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Pagination({
  currentPage = 1,
  totalItems = 0,
  itemsPerPage = 10,
  onPageChange,
  className = ''
}) {
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      onPageChange(totalPages);
    } else if (currentPage < 1 && totalPages > 0) {
      onPageChange(1);
    }
  }, [currentPage, totalPages, onPageChange]);

  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  const getPageNumbers = () => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (currentPage <= 4) {
      return [1, 2, 3, 4, 5, '...', totalPages];
    }
    if (currentPage >= totalPages - 3) {
      return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }
    return [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
  };

  const pageNumbers = getPageNumbers();

  return (
    <div className={`flex flex-col sm:flex-row items-center justify-between gap-3 text-sm select-none ${className}`}>
      {/* High-Contrast Clear Range Status */}
      <div className="font-medium text-gray-700 dark:text-slate-200">
        {totalItems === 0 ? (
          <span>Showing 0 entries</span>
        ) : (
          <span>
            Showing <span className="font-bold text-gray-950 dark:text-white">{startItem}</span> to{' '}
            <span className="font-bold text-gray-950 dark:text-white">{endItem}</span> of{' '}
            <span className="font-bold text-gray-950 dark:text-white">{totalItems}</span> entries
          </span>
        )}
      </div>

      {/* Pagination Controls */}
      <div className="flex items-center gap-1.5">
        {/* Previous Button */}
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-300 dark:border-dark-border bg-white dark:bg-dark-card text-gray-800 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-dark-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-xs text-xs font-semibold"
          aria-label="Previous page"
        >
          <ChevronLeft size={15} />
          <span>Previous</span>
        </button>

        {/* Page Number Buttons */}
        <div className="flex items-center gap-1">
          {pageNumbers.map((page, idx) => {
            if (page === '...') {
              return (
                <span
                  key={`ellipsis-${idx}`}
                  className="px-2 py-1 text-gray-500 dark:text-slate-400 font-bold select-none"
                >
                  ...
                </span>
              );
            }

            const isActive = page === currentPage;
            return (
              <button
                key={page}
                type="button"
                onClick={() => onPageChange(page)}
                className={`min-w-[32px] h-[32px] flex items-center justify-center rounded-lg text-xs font-bold transition-colors ${
                  isActive
                    ? 'bg-primary-800 text-white shadow-sm border border-primary-800 ring-2 ring-primary-300 dark:ring-purple-700'
                    : 'bg-white dark:bg-dark-card border border-gray-300 dark:border-dark-border text-gray-800 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-dark-hover shadow-xs'
                }`}
                aria-current={isActive ? 'page' : undefined}
              >
                {page}
              </button>
            );
          })}
        </div>

        {/* Next Button */}
        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-300 dark:border-dark-border bg-white dark:bg-dark-card text-gray-800 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-dark-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-xs text-xs font-semibold"
          aria-label="Next page"
        >
          <span>Next</span>
          <ChevronRight size={15} />
        </button>
      </div>
    </div>
  );
}
