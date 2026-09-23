import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

export interface PaginationProps {
  page: number;
  totalPages: number;
  totalItems?: number;
  limit?: number;
  onPageChange: (page: number) => void;
  onLimitChange?: (limit: number) => void;
  pageSizeOptions?: number[];
  isLoading?: boolean;
}

export function Pagination({
  page,
  totalPages,
  totalItems,
  limit,
  onPageChange,
  onLimitChange,
  pageSizeOptions = [10, 20, 50, 100],
  isLoading = false,
}: PaginationProps) {
  if (totalPages <= 1 && (!totalItems || totalItems <= (limit || 10))) {
    return null;
  }

  // Calculate item range for "Showing X to Y of Z"
  const startItem = totalItems !== undefined && limit !== undefined ? (page - 1) * limit + 1 : null;
  const endItem =
    totalItems !== undefined && limit !== undefined ? Math.min(page * limit, totalItems) : null;

  // Generate pagination items with smart ellipsis
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible + 2) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);

      if (page > 3) {
        pages.push('...');
      }

      const start = Math.max(2, page - 1);
      const end = Math.min(totalPages - 1, page + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (page < totalPages - 2) {
        pages.push('...');
      }

      pages.push(totalPages);
    }

    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '1rem 1.25rem',
        backgroundColor: '#ffffff',
        borderTop: '1px solid #e2e8f0',
        borderRadius: '0 0 12px 12px',
        flexWrap: 'wrap',
        gap: '1rem',
      }}
    >
      {/* Left side: Results Count & Page Size Selector */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
          {totalItems !== undefined && startItem !== null && endItem !== null ? (
            <span>
              Showing <strong style={{ color: '#0f172a' }}>{startItem}</strong> to{' '}
              <strong style={{ color: '#0f172a' }}>{endItem}</strong> of{' '}
              <strong style={{ color: '#0f172a' }}>{totalItems}</strong> entries
            </span>
          ) : (
            <span>
              Page <strong style={{ color: '#0f172a' }}>{page}</strong> of{' '}
              <strong style={{ color: '#0f172a' }}>{totalPages}</strong>
            </span>
          )}
        </div>

        {onLimitChange && limit !== undefined && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Show:</span>
            <select
              value={limit}
              onChange={(e) => onLimitChange(Number(e.target.value))}
              disabled={isLoading}
              style={{
                fontSize: '0.8125rem',
                padding: '4px 8px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#f8fafc',
                color: '#334155',
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt} / page
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Right side: Page Navigation Controls */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
        }}
      >
        {/* First Page Button */}
        <button
          onClick={() => onPageChange(1)}
          disabled={page <= 1 || isLoading}
          title="First Page"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '32px',
            height: '32px',
            borderRadius: '6px',
            border: '1px solid #e2e8f0',
            backgroundColor: '#ffffff',
            color: page <= 1 ? '#cbd5e1' : '#475569',
            cursor: page <= 1 || isLoading ? 'not-allowed' : 'pointer',
            transition: 'all 150ms ease',
          }}
        >
          <ChevronsLeft size={15} />
        </button>

        {/* Previous Button */}
        <button
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page <= 1 || isLoading}
          title="Previous Page"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 10px',
            height: '32px',
            borderRadius: '6px',
            border: '1px solid #e2e8f0',
            backgroundColor: '#ffffff',
            color: page <= 1 ? '#cbd5e1' : '#475569',
            fontSize: '0.8125rem',
            fontWeight: 500,
            cursor: page <= 1 || isLoading ? 'not-allowed' : 'pointer',
            transition: 'all 150ms ease',
            gap: '3px',
          }}
        >
          <ChevronLeft size={14} />
          <span>Prev</span>
        </button>

        {/* Numbered Page Buttons */}
        {pageNumbers.map((p, idx) => {
          if (p === '...') {
            return (
              <span
                key={`ellipsis-${idx}`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '32px',
                  height: '32px',
                  color: '#94a3b8',
                  fontSize: '0.85rem',
                }}
              >
                ...
              </span>
            );
          }

          const pageNum = Number(p);
          const isActive = pageNum === page;

          return (
            <button
              key={`page-${pageNum}`}
              onClick={() => onPageChange(pageNum)}
              disabled={isLoading}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '32px',
                height: '32px',
                borderRadius: '6px',
                border: isActive ? '1px solid #2563eb' : '1px solid #e2e8f0',
                backgroundColor: isActive ? '#2563eb' : '#ffffff',
                color: isActive ? '#ffffff' : '#334155',
                fontSize: '0.8125rem',
                fontWeight: isActive ? 600 : 500,
                cursor: isLoading ? 'not-allowed' : 'pointer',
                transition: 'all 150ms ease',
              }}
            >
              {pageNum}
            </button>
          );
        })}

        {/* Next Button */}
        <button
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages || isLoading}
          title="Next Page"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 10px',
            height: '32px',
            borderRadius: '6px',
            border: '1px solid #e2e8f0',
            backgroundColor: '#ffffff',
            color: page >= totalPages ? '#cbd5e1' : '#475569',
            fontSize: '0.8125rem',
            fontWeight: 500,
            cursor: page >= totalPages || isLoading ? 'not-allowed' : 'pointer',
            transition: 'all 150ms ease',
            gap: '3px',
          }}
        >
          <span>Next</span>
          <ChevronRight size={14} />
        </button>

        {/* Last Page Button */}
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={page >= totalPages || isLoading}
          title="Last Page"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '32px',
            height: '32px',
            borderRadius: '6px',
            border: '1px solid #e2e8f0',
            backgroundColor: '#ffffff',
            color: page >= totalPages ? '#cbd5e1' : '#475569',
            cursor: page >= totalPages || isLoading ? 'not-allowed' : 'pointer',
            transition: 'all 150ms ease',
          }}
        >
          <ChevronsRight size={15} />
        </button>
      </div>
    </div>
  );
}
