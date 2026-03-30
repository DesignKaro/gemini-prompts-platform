'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActionError } from '@/app/components/dashboard/action-error';
import { useAdminApi } from '@/app/components/dashboard/use-admin-api';
import { buildErrorLogsQuery } from '../api';
import { formatBytes, formatIsoTimestamp } from '../hooks';
import { DEFAULT_PAGE_STATE } from '../state';
import type { DashboardPageState, ErrorLogEntry, ErrorLogLevelFilter, ErrorLogsResponse } from '../types';

const LIMIT_OPTIONS = [50, 100, 150, 300, 500];

const LEVEL_OPTIONS: Array<{ value: ErrorLogLevelFilter; label: string }> = [
  { value: 'error', label: 'Errors Only' },
  { value: 'warn', label: 'Warnings + Errors' },
  { value: 'all', label: 'All Lines' },
];

function getLevelPillClass(level: ErrorLogEntry['level']) {
  if (level === 'error') {
    return 'bg-red-100 text-red-700 border border-red-200';
  }
  if (level === 'warn') {
    return 'bg-amber-100 text-amber-800 border border-amber-200';
  }
  if (level === 'info') {
    return 'bg-blue-100 text-blue-700 border border-blue-200';
  }
  return 'bg-gray-100 text-gray-700 border border-gray-200';
}

export function LogsScreen() {
  const { request: adminRequest } = useAdminApi();
  const [pageState, setPageState] = useState<DashboardPageState>(DEFAULT_PAGE_STATE);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<ErrorLogsResponse | null>(null);
  const [fileId, setFileId] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState<ErrorLogLevelFilter>('error');
  const [limit, setLimit] = useState<number>(150);
  const [refreshNonce, setRefreshNonce] = useState(0);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
    }, 250);
    return () => window.clearTimeout(timeout);
  }, [searchInput]);

  const fetchLogs = useCallback(
    async (signal: AbortSignal) => {
      setPageState((current) => (current === 'loading' ? 'loading' : 'saving'));
      setError(null);
      const query = buildErrorLogsQuery({
        fileId: fileId || undefined,
        search: debouncedSearch || undefined,
        level: levelFilter,
        limit,
      });

      try {
        const payload = await adminRequest<ErrorLogsResponse>(
          `/api/admin/logs/errors${query.size > 0 ? `?${query.toString()}` : ''}`,
          {
            actionName: 'admin.logs.errors.list',
            signal,
          },
        );
        setResponse(payload);
        setPageState(payload.entries.length > 0 ? 'ready' : 'empty');
      } catch (requestError) {
        if (requestError instanceof Error && requestError.name === 'AbortError') {
          return;
        }
        setError(requestError instanceof Error ? requestError.message : 'Unable to load error logs.');
        setPageState('error');
      }
    },
    [adminRequest, debouncedSearch, fileId, levelFilter, limit],
  );

  useEffect(() => {
    const controller = new AbortController();
    void fetchLogs(controller.signal);
    return () => controller.abort();
  }, [fetchLogs, refreshNonce]);

  const selectedFile = response?.selectedFile ?? null;
  const files = response?.files ?? [];
  const entries = response?.entries ?? [];
  const infoLabel = useMemo(() => {
    if (!selectedFile) {
      return 'No log files were found in the configured locations yet.';
    }
    return `${selectedFile.name} • ${formatBytes(selectedFile.sizeBytes)} • Updated ${formatIsoTimestamp(
      selectedFile.updatedAt,
    )}`;
  }, [selectedFile]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[1.85rem] font-semibold leading-tight text-[#0f1116]">Error Logs</h1>
          <p className="mt-1 text-[0.95rem] text-gray-500">
            Complete log stream with error visibility, filtering, and search.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setRefreshNonce((value) => value + 1)}
          className="rounded-full border border-[#d9dfeb] bg-white px-4 py-2 text-[0.82rem] font-medium text-[#0f1116] transition-colors hover:bg-[#f5f7fb]"
        >
          Refresh Logs
        </button>
      </div>

      <div className="rounded-[20px] border border-[#e8ecf4] bg-white p-4 sm:p-5">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <label className="flex flex-col gap-1 text-[0.74rem] font-semibold uppercase tracking-wide text-gray-500">
            Log File
            <select
              value={fileId}
              onChange={(event) => setFileId(event.target.value)}
              className="h-10 rounded-xl border border-[#e3e8f3] bg-white px-3 text-[0.86rem] font-medium text-[#0f1116] outline-none transition-colors focus:border-[#c9d5f0]"
            >
              <option value="">Auto Select Latest</option>
              {files.map((file) => (
                <option key={file.id} value={file.id}>
                  {file.name}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-[0.74rem] font-semibold uppercase tracking-wide text-gray-500">
            Level
            <select
              value={levelFilter}
              onChange={(event) => setLevelFilter(event.target.value as ErrorLogLevelFilter)}
              className="h-10 rounded-xl border border-[#e3e8f3] bg-white px-3 text-[0.86rem] font-medium text-[#0f1116] outline-none transition-colors focus:border-[#c9d5f0]"
            >
              {LEVEL_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-[0.74rem] font-semibold uppercase tracking-wide text-gray-500">
            Rows
            <select
              value={limit}
              onChange={(event) => setLimit(Number.parseInt(event.target.value, 10))}
              className="h-10 rounded-xl border border-[#e3e8f3] bg-white px-3 text-[0.86rem] font-medium text-[#0f1116] outline-none transition-colors focus:border-[#c9d5f0]"
            >
              {LIMIT_OPTIONS.map((count) => (
                <option key={count} value={count}>
                  {count}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-[0.74rem] font-semibold uppercase tracking-wide text-gray-500">
            Search
            <input
              type="text"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search by message, request ID..."
              className="h-10 rounded-xl border border-[#e3e8f3] bg-white px-3 text-[0.86rem] font-medium text-[#0f1116] outline-none transition-colors placeholder:text-gray-400 focus:border-[#c9d5f0]"
            />
          </label>
        </div>
        <p className="mt-3 text-[0.78rem] text-gray-500">{infoLabel}</p>
      </div>

      <ActionError error={error} onRetry={() => setRefreshNonce((value) => value + 1)} />

      {response?.truncatedFromStart && (
        <div className="rounded-[14px] border border-amber-200 bg-amber-50 px-4 py-3 text-[0.82rem] text-amber-800">
          Showing the most recent log segment (older lines were truncated for performance).
        </div>
      )}

      {pageState === 'loading' && (
        <div className="rounded-[20px] border border-[#e8ecf4] bg-white p-10 text-center text-[0.9rem] text-gray-500">
          Loading logs...
        </div>
      )}

      {pageState !== 'loading' && entries.length === 0 && (
        <div className="rounded-[20px] border border-[#e8ecf4] bg-white p-10 text-center text-[0.9rem] text-gray-500">
          No log entries matched your current filters.
        </div>
      )}

      {entries.length > 0 && (
        <div className="rounded-[20px] border border-[#e8ecf4] bg-white">
          <div className="border-b border-[#edf1f8] px-4 py-3 text-[0.78rem] text-gray-500">
            Showing {entries.length} entries • Scanned {response?.scannedLineCount ?? entries.length} lines
          </div>
          <div className="max-h-[65vh] divide-y divide-[#edf1f8] overflow-auto">
            {entries.map((entry, index) => (
              <div key={`${entry.timestamp ?? 'no-ts'}-${index}`} className="px-4 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[0.68rem] font-semibold uppercase tracking-wide ${getLevelPillClass(
                      entry.level,
                    )}`}
                  >
                    {entry.level}
                  </span>
                  <span className="text-[0.74rem] text-gray-500">{formatIsoTimestamp(entry.timestamp)}</span>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-[0.87rem] leading-relaxed text-[#12141a]">
                  {entry.message}
                </p>
                <pre className="mt-2 overflow-x-auto rounded-xl bg-[#f7f9fc] p-3 text-[0.75rem] leading-relaxed text-gray-700">
                  {entry.raw}
                </pre>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

