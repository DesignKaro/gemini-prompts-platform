'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActionError } from '../../../../app/components/dashboard/action-error';
import { useAdminApi } from '../../../../app/components/dashboard/use-admin-api';
import { buildNewsletterSubmissionsQuery } from '../api';
import { formatSubmissionTimestamp } from '../hooks';
import { DEFAULT_PAGE_SIZE, DEFAULT_PAGE_STATE } from '../state';
import type { DashboardPageState, NewsletterSubmissionsResponse } from '../types';

const PAGE_SIZE_OPTIONS = [20, 50, 100];

export function NewsletterSubmissionsScreen() {
  const { request: adminRequest } = useAdminApi();
  const [pageState, setPageState] = useState<DashboardPageState>(DEFAULT_PAGE_STATE);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<NewsletterSubmissionsResponse | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [sort, setSort] = useState<'recent' | 'oldest'>('recent');
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [pageIndex, setPageIndex] = useState(0);
  const [refreshNonce, setRefreshNonce] = useState(0);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setPageIndex(0);
    }, 250);
    return () => window.clearTimeout(timeout);
  }, [searchInput]);

  const fetchSubmissions = useCallback(
    async (signal: AbortSignal) => {
      setPageState((current) => (current === 'loading' ? 'loading' : 'saving'));
      setError(null);
      const skip = pageIndex * pageSize;
      const query = buildNewsletterSubmissionsQuery({
        skip,
        take: pageSize,
        search: debouncedSearch,
        source: sourceFilter,
        from: fromDate,
        to: toDate,
        sort,
      });

      try {
        const payload = await adminRequest<NewsletterSubmissionsResponse>(
          `/api/admin/newsletter/submissions${query.size > 0 ? `?${query.toString()}` : ''}`,
          {
            actionName: 'admin.newsletter.submissions.list',
            signal,
          },
        );
        setResponse(payload);
        setPageState(payload.items.length > 0 ? 'ready' : 'empty');
      } catch (requestError) {
        if (requestError instanceof Error && requestError.name === 'AbortError') {
          return;
        }
        setError(
          requestError instanceof Error
            ? requestError.message
            : 'Unable to load newsletter submissions.',
        );
        setPageState('error');
      }
    },
    [adminRequest, debouncedSearch, fromDate, pageIndex, pageSize, sort, sourceFilter, toDate],
  );

  useEffect(() => {
    const controller = new AbortController();
    void fetchSubmissions(controller.signal);
    return () => controller.abort();
  }, [fetchSubmissions, refreshNonce]);

  const submissions = response?.items ?? [];
  const total = response?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const canPrev = pageIndex > 0;
  const canNext = pageIndex + 1 < totalPages;

  const sourceOptions = useMemo(() => response?.sources ?? [], [response?.sources]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[1.85rem] font-semibold leading-tight text-[#0f1116]">Newsletter</h1>
          <p className="mt-1 text-[0.95rem] text-gray-500">
            All newsletter form submissions from public website surfaces.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setRefreshNonce((value) => value + 1)}
          className="rounded-full border border-[#d9dfeb] bg-white px-4 py-2 text-[0.82rem] font-medium text-[#0f1116] transition-colors hover:bg-[#f5f7fb]"
        >
          Refresh
        </button>
      </div>

      <div className="rounded-[20px] border border-[#e8ecf4] bg-white p-4 sm:p-5">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <label className="flex flex-col gap-1 text-[0.74rem] font-semibold uppercase tracking-wide text-gray-500">
            Search
            <input
              type="text"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Email, source, page path..."
              className="h-10 rounded-xl border border-[#e3e8f3] bg-white px-3 text-[0.86rem] font-medium text-[#0f1116] outline-none transition-colors placeholder:text-gray-400 focus:border-[#c9d5f0]"
            />
          </label>

          <label className="flex flex-col gap-1 text-[0.74rem] font-semibold uppercase tracking-wide text-gray-500">
            Source
            <select
              value={sourceFilter}
              onChange={(event) => {
                setSourceFilter(event.target.value);
                setPageIndex(0);
              }}
              className="h-10 rounded-xl border border-[#e3e8f3] bg-white px-3 text-[0.86rem] font-medium text-[#0f1116] outline-none transition-colors focus:border-[#c9d5f0]"
            >
              <option value="">All sources</option>
              {sourceOptions.map((source) => (
                <option key={source} value={source}>
                  {source}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-[0.74rem] font-semibold uppercase tracking-wide text-gray-500">
            From
            <input
              type="date"
              value={fromDate}
              onChange={(event) => {
                setFromDate(event.target.value);
                setPageIndex(0);
              }}
              className="h-10 rounded-xl border border-[#e3e8f3] bg-white px-3 text-[0.86rem] font-medium text-[#0f1116] outline-none transition-colors focus:border-[#c9d5f0]"
            />
          </label>

          <label className="flex flex-col gap-1 text-[0.74rem] font-semibold uppercase tracking-wide text-gray-500">
            To
            <input
              type="date"
              value={toDate}
              onChange={(event) => {
                setToDate(event.target.value);
                setPageIndex(0);
              }}
              className="h-10 rounded-xl border border-[#e3e8f3] bg-white px-3 text-[0.86rem] font-medium text-[#0f1116] outline-none transition-colors focus:border-[#c9d5f0]"
            />
          </label>

          <div className="grid grid-cols-2 gap-2">
            <label className="flex flex-col gap-1 text-[0.74rem] font-semibold uppercase tracking-wide text-gray-500">
              Sort
              <select
                value={sort}
                onChange={(event) => {
                  setSort(event.target.value as 'recent' | 'oldest');
                  setPageIndex(0);
                }}
                className="h-10 rounded-xl border border-[#e3e8f3] bg-white px-3 text-[0.86rem] font-medium text-[#0f1116] outline-none transition-colors focus:border-[#c9d5f0]"
              >
                <option value="recent">Recent</option>
                <option value="oldest">Oldest</option>
              </select>
            </label>

            <label className="flex flex-col gap-1 text-[0.74rem] font-semibold uppercase tracking-wide text-gray-500">
              Rows
              <select
                value={pageSize}
                onChange={(event) => {
                  setPageSize(Number.parseInt(event.target.value, 10));
                  setPageIndex(0);
                }}
                className="h-10 rounded-xl border border-[#e3e8f3] bg-white px-3 text-[0.86rem] font-medium text-[#0f1116] outline-none transition-colors focus:border-[#c9d5f0]"
              >
                {PAGE_SIZE_OPTIONS.map((count) => (
                  <option key={count} value={count}>
                    {count}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      </div>

      <ActionError error={error} onRetry={() => setRefreshNonce((value) => value + 1)} />

      {pageState === 'loading' && (
        <div className="rounded-[20px] border border-[#e8ecf4] bg-white p-10 text-center text-[0.9rem] text-gray-500">
          Loading newsletter submissions...
        </div>
      )}

      {pageState !== 'loading' && submissions.length === 0 && (
        <div className="rounded-[20px] border border-[#e8ecf4] bg-white p-10 text-center text-[0.9rem] text-gray-500">
          No submissions matched your filters.
        </div>
      )}

      {submissions.length > 0 && (
        <div className="overflow-hidden rounded-[20px] border border-[#e8ecf4] bg-white">
          <div className="border-b border-[#edf1f8] px-4 py-3 text-[0.78rem] text-gray-500">
            Showing {submissions.length} of {total} submissions
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-[0.9rem]">
              <thead className="bg-[#f7f9fc] text-[0.72rem] uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Email</th>
                  <th className="px-4 py-3 font-semibold">Source</th>
                  <th className="px-4 py-3 font-semibold">Page</th>
                  <th className="px-4 py-3 font-semibold">Submitted At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#edf1f8]">
                {submissions.map((item) => (
                  <tr key={item.id} className="text-[#11141b]">
                    <td className="px-4 py-3 font-medium">{item.email}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-[#f1f4fa] px-2.5 py-1 text-[0.78rem] font-medium text-[#384253]">
                        {item.source}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[#4a5363]">{item.pagePath || '—'}</td>
                    <td className="px-4 py-3 text-[#4a5363]">
                      {formatSubmissionTimestamp(item.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between border-t border-[#edf1f8] px-4 py-3">
            <p className="text-[0.78rem] text-gray-500">
              Page {pageIndex + 1} of {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPageIndex((index) => Math.max(0, index - 1))}
                disabled={!canPrev}
                className="rounded-full border border-[#d9dfeb] bg-white px-3 py-1.5 text-[0.78rem] font-medium text-[#0f1116] transition-colors hover:bg-[#f5f7fb] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() => setPageIndex((index) => index + 1)}
                disabled={!canNext}
                className="rounded-full border border-[#d9dfeb] bg-white px-3 py-1.5 text-[0.78rem] font-medium text-[#0f1116] transition-colors hover:bg-[#f5f7fb] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
