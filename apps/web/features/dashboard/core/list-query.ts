export type SortDirection = 'asc' | 'desc';

export function normalizeSearchTerm(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

export function buildPaginationParams(skip = 0, take = 30): URLSearchParams {
  const params = new URLSearchParams();
  params.set('skip', String(Math.max(0, skip)));
  params.set('take', String(Math.max(1, take)));
  return params;
}

export function appendSearchParam(params: URLSearchParams, search: string): URLSearchParams {
  const normalized = normalizeSearchTerm(search);
  if (normalized) {
    params.set('search', normalized);
  }
  return params;
}

export function appendSortParam(
  params: URLSearchParams,
  sort: string | undefined,
  allowed: readonly string[],
  fallback: string,
): URLSearchParams {
  const effective = sort && allowed.includes(sort) ? sort : fallback;
  params.set('sort', effective);
  return params;
}

export function compareByIsoDate(a: string, b: string, direction: SortDirection = 'desc'): number {
  const aTime = Date.parse(a);
  const bTime = Date.parse(b);
  const safeA = Number.isNaN(aTime) ? 0 : aTime;
  const safeB = Number.isNaN(bTime) ? 0 : bTime;
  return direction === 'asc' ? safeA - safeB : safeB - safeA;
}
