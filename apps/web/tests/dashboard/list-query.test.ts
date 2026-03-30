import {
  appendSearchParam,
  appendSortParam,
  buildPaginationParams,
  compareByIsoDate,
  normalizeSearchTerm,
} from '../../features/dashboard/core/list-query';

describe('dashboard core list-query helpers', () => {
  it('normalizes search whitespace', () => {
    expect(normalizeSearchTerm('   hello    world  ')).toBe('hello world');
  });

  it('builds safe pagination params', () => {
    const params = buildPaginationParams(-4, 0);
    expect(params.get('skip')).toBe('0');
    expect(params.get('take')).toBe('1');
  });

  it('appends search and sort with fallback', () => {
    const params = buildPaginationParams(0, 30);
    appendSearchParam(params, '   growth strategy   ');
    appendSortParam(params, 'invalid', ['recent', 'views', 'az'], 'recent');

    expect(params.get('search')).toBe('growth strategy');
    expect(params.get('sort')).toBe('recent');
  });

  it('compares iso dates in expected direction', () => {
    const newer = '2026-03-28T08:00:00.000Z';
    const older = '2026-03-20T08:00:00.000Z';

    expect(compareByIsoDate(newer, older, 'desc')).toBeLessThan(0);
    expect(compareByIsoDate(newer, older, 'asc')).toBeGreaterThan(0);
  });
});
