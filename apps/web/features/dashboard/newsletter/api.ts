export function buildNewsletterSubmissionsQuery(params: {
  skip?: number;
  take?: number;
  search?: string;
  source?: string;
  from?: string;
  to?: string;
  sort?: 'recent' | 'oldest';
}) {
  const query = new URLSearchParams();

  if (typeof params.skip === 'number' && Number.isFinite(params.skip) && params.skip > 0) {
    query.set('skip', String(Math.floor(params.skip)));
  }
  if (typeof params.take === 'number' && Number.isFinite(params.take) && params.take > 0) {
    query.set('take', String(Math.floor(params.take)));
  }
  if (params.search?.trim()) {
    query.set('search', params.search.trim());
  }
  if (params.source?.trim()) {
    query.set('source', params.source.trim());
  }
  if (params.from?.trim()) {
    query.set('from', params.from.trim());
  }
  if (params.to?.trim()) {
    query.set('to', params.to.trim());
  }
  if (params.sort) {
    query.set('sort', params.sort);
  }

  return query;
}
