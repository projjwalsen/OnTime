/**
 * Pagination and filtering shared contracts.
 */

export interface PaginationParams {
  page?: number | undefined;
  limit?: number | undefined;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResult<T> {
  items: T[];
  pagination: PaginationMeta;
}
