export interface PaginationParams {
  page: number;
  perPage: number;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    perPage: number;
    total: number;
    totalPages: number;
  };
}

export function parsePagination(query: Record<string, unknown>): PaginationParams {
  const page = Math.max(1, Number(query.page) || 1);
  const perPage = Math.min(100, Math.max(1, Number(query.perPage) || 25));
  return { page, perPage };
}

export function paginationMeta(total: number, params: PaginationParams) {
  return {
    page: params.page,
    perPage: params.perPage,
    total,
    totalPages: Math.ceil(total / params.perPage),
  };
}

export function paginationOffset(params: PaginationParams) {
  return (params.page - 1) * params.perPage;
}
