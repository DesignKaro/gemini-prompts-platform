import type { ErrorLogLevelFilter } from './types';

export function buildErrorLogsQuery(params: {
  fileId?: string;
  search?: string;
  level?: ErrorLogLevelFilter;
  limit?: number;
}) {
  const query = new URLSearchParams();
  if (params.fileId) {
    query.set('fileId', params.fileId);
  }
  if (params.search?.trim()) {
    query.set('search', params.search.trim());
  }
  if (params.level) {
    query.set('level', params.level);
  }
  if (typeof params.limit === 'number' && Number.isFinite(params.limit)) {
    query.set('limit', String(Math.max(1, Math.floor(params.limit))));
  }
  return query;
}

