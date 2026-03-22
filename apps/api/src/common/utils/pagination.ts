export const DEFAULT_TAKE = 20;
export const MAX_TAKE = 200;

export function normalizePagination(skip?: number, take?: number) {
  const safeSkip = Number.isFinite(skip) ? Math.max(0, Math.floor(skip as number)) : 0;
  const safeTake = Number.isFinite(take)
    ? Math.min(Math.max(Math.floor(take as number), 1), MAX_TAKE)
    : DEFAULT_TAKE;

  return { skip: safeSkip, take: safeTake };
}
