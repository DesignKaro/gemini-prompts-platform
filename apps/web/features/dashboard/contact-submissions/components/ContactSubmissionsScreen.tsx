'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActionError } from '../../../../app/components/dashboard/action-error';
import { useAdminApi } from '../../../../app/components/dashboard/use-admin-api';
import { buildContactSubmissionsQuery } from '../api';
import { formatStatusLabel, formatSubmissionTimestamp } from '../hooks';
import { DEFAULT_PAGE_SIZE, DEFAULT_PAGE_STATE } from '../state';
import type {
  ContactSubmissionDetail,
  ContactSubmissionStatus,
  ContactSubmissionsResponse,
  DashboardPageState,
} from '../types';

const PAGE_SIZE_OPTIONS = [20, 50, 100, 200];
const FALLBACK_STATUSES: ContactSubmissionStatus[] = ['NEW', 'IN_PROGRESS', 'RESOLVED', 'SPAM'];

const STATUS_BADGES: Record<ContactSubmissionStatus, string> = {
  NEW: 'bg-[#eef4ff] text-[#3158b8] border-[#d7e4ff]',
  IN_PROGRESS: 'bg-[#fff7e8] text-[#9c6a1b] border-[#f4e1bd]',
  RESOLVED: 'bg-[#eaf8ef] text-[#1e7a45] border-[#d2eddc]',
  SPAM: 'bg-[#fff0f0] text-[#ab2f2f] border-[#f3d3d3]',
};

export function ContactSubmissionsScreen() {
  const { request: adminRequest } = useAdminApi();
  const [pageState, setPageState] = useState<DashboardPageState>(DEFAULT_PAGE_STATE);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<ContactSubmissionsResponse | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<ContactSubmissionDetail | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [isSavingDetail, setIsSavingDetail] = useState(false);

  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ContactSubmissionStatus | ''>('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [sort, setSort] = useState<'recent' | 'oldest'>('recent');
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [pageIndex, setPageIndex] = useState(0);
  const [refreshNonce, setRefreshNonce] = useState(0);

  const [statusDraft, setStatusDraft] = useState<ContactSubmissionStatus>('NEW');
  const [noteDraft, setNoteDraft] = useState('');

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
      const query = buildContactSubmissionsQuery({
        skip,
        take: pageSize,
        search: debouncedSearch,
        status: statusFilter,
        source: sourceFilter,
        from: fromDate,
        to: toDate,
        sort,
      });

      try {
        const payload = await adminRequest<ContactSubmissionsResponse>(
          `/api/admin/contact/submissions${query.size > 0 ? `?${query.toString()}` : ''}`,
          {
            actionName: 'admin.contact.submissions.list',
            signal,
          },
        );

        setResponse(payload);
        setPageState(payload.items.length > 0 ? 'ready' : 'empty');
        setSelectedId((current) => {
          if (payload.items.length === 0) {
            return null;
          }
          if (current && payload.items.some((item) => item.id === current)) {
            return current;
          }
          return payload.items[0]?.id ?? null;
        });
      } catch (requestError) {
        if (requestError instanceof Error && requestError.name === 'AbortError') {
          return;
        }
        setError(
          requestError instanceof Error
            ? requestError.message
            : 'Unable to load contact submissions.',
        );
        setPageState('error');
      }
    },
    [
      adminRequest,
      debouncedSearch,
      fromDate,
      pageIndex,
      pageSize,
      sort,
      sourceFilter,
      statusFilter,
      toDate,
    ],
  );

  useEffect(() => {
    const controller = new AbortController();
    void fetchSubmissions(controller.signal);
    return () => controller.abort();
  }, [fetchSubmissions, refreshNonce]);

  const fetchDetail = useCallback(
    async (id: string, signal: AbortSignal) => {
      setIsDetailLoading(true);
      setDetailError(null);

      try {
        const payload = await adminRequest<ContactSubmissionDetail>(`/api/admin/contact/submissions/${id}`, {
          actionName: 'admin.contact.submissions.detail',
          signal,
        });
        setSelectedDetail(payload);
        setStatusDraft(payload.status);
        setNoteDraft(payload.internalNote ?? '');
      } catch (requestError) {
        if (requestError instanceof Error && requestError.name === 'AbortError') {
          return;
        }
        setSelectedDetail(null);
        setDetailError(
          requestError instanceof Error ? requestError.message : 'Unable to load submission details.',
        );
      } finally {
        setIsDetailLoading(false);
      }
    },
    [adminRequest],
  );

  useEffect(() => {
    if (!selectedId) {
      setSelectedDetail(null);
      setDetailError(null);
      return;
    }

    const controller = new AbortController();
    void fetchDetail(selectedId, controller.signal);
    return () => controller.abort();
  }, [fetchDetail, selectedId]);

  const saveDetail = async () => {
    if (!selectedDetail || isSavingDetail) {
      return;
    }

    setIsSavingDetail(true);
    setDetailError(null);

    try {
      const payload = await adminRequest<ContactSubmissionDetail>(
        `/api/admin/contact/submissions/${selectedDetail.id}`,
        {
          method: 'PATCH',
          actionName: 'admin.contact.submissions.update',
          body: JSON.stringify({
            status: statusDraft,
            internalNote: noteDraft,
          }),
        },
      );

      setSelectedDetail(payload);
      setStatusDraft(payload.status);
      setNoteDraft(payload.internalNote ?? '');
      setResponse((current) => {
        if (!current) {
          return current;
        }
        return {
          ...current,
          items: current.items.map((item) =>
            item.id === payload.id
              ? {
                  ...item,
                  status: payload.status,
                  reviewedAt: payload.reviewedAt,
                }
              : item,
          ),
        };
      });
    } catch (requestError) {
      setDetailError(
        requestError instanceof Error
          ? requestError.message
          : 'Unable to update contact submission.',
      );
    } finally {
      setIsSavingDetail(false);
    }
  };

  const submissions = response?.items ?? [];
  const total = response?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const canPrev = pageIndex > 0;
  const canNext = pageIndex + 1 < totalPages;

  const sourceOptions = useMemo(() => response?.sources ?? [], [response?.sources]);
  const statusOptions = useMemo(
    () => (response?.statuses && response.statuses.length > 0 ? response.statuses : FALLBACK_STATUSES),
    [response?.statuses],
  );

  const hasChanges = useMemo(() => {
    if (!selectedDetail) {
      return false;
    }
    return selectedDetail.status !== statusDraft || (selectedDetail.internalNote ?? '') !== noteDraft;
  }, [noteDraft, selectedDetail, statusDraft]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[1.85rem] font-semibold leading-tight text-[#0f1116]">
            Contact submissions
          </h1>
          <p className="mt-1 text-[0.95rem] text-gray-500">
            Inbox for public contact form messages with review status and internal notes.
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
          <label className="flex flex-col gap-1 text-[0.74rem] font-semibold uppercase tracking-wide text-gray-500 xl:col-span-2">
            Search
            <input
              type="text"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Name, email, subject, message..."
              className="h-10 rounded-xl border border-[#e3e8f3] bg-white px-3 text-[0.86rem] font-medium text-[#0f1116] outline-none transition-colors placeholder:text-gray-400 focus:border-[#c9d5f0]"
            />
          </label>

          <label className="flex flex-col gap-1 text-[0.74rem] font-semibold uppercase tracking-wide text-gray-500">
            Status
            <select
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value as ContactSubmissionStatus | '');
                setPageIndex(0);
              }}
              className="h-10 rounded-xl border border-[#e3e8f3] bg-white px-3 text-[0.86rem] font-medium text-[#0f1116] outline-none transition-colors focus:border-[#c9d5f0]"
            >
              <option value="">All statuses</option>
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {formatStatusLabel(status)}
                </option>
              ))}
            </select>
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

          <button
            type="button"
            onClick={() => {
              setSearchInput('');
              setDebouncedSearch('');
              setStatusFilter('');
              setSourceFilter('');
              setFromDate('');
              setToDate('');
              setSort('recent');
              setPageSize(DEFAULT_PAGE_SIZE);
              setPageIndex(0);
            }}
            className="h-10 self-end rounded-xl border border-[#e3e8f3] bg-white px-3 text-[0.83rem] font-medium text-[#5f6773] transition-colors hover:bg-[#f8fafd]"
          >
            Clear filters
          </button>
        </div>
      </div>

      <ActionError error={error} onRetry={() => setRefreshNonce((value) => value + 1)} />

      {pageState === 'loading' ? (
        <div className="rounded-[20px] border border-[#e8ecf4] bg-white p-10 text-center text-[0.9rem] text-gray-500">
          Loading contact submissions...
        </div>
      ) : null}

      {pageState !== 'loading' && submissions.length === 0 ? (
        <div className="rounded-[20px] border border-[#e8ecf4] bg-white p-10 text-center text-[0.9rem] text-gray-500">
          No contact submissions matched your filters.
        </div>
      ) : null}

      {submissions.length > 0 ? (
        <div className="space-y-4">
          <div className="overflow-hidden rounded-[20px] border border-[#e8ecf4] bg-white">
            <div className="border-b border-[#edf1f8] px-4 py-3 text-[0.78rem] text-gray-500">
              Showing {submissions.length} of {total} submissions
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-[0.9rem]">
                <thead className="bg-[#f7f9fc] text-[0.72rem] uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Name</th>
                    <th className="px-4 py-3 font-semibold">Email</th>
                    <th className="px-4 py-3 font-semibold">Subject</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Source</th>
                    <th className="px-4 py-3 font-semibold">Submitted</th>
                    <th className="px-4 py-3 font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#edf1f8]">
                  {submissions.map((item) => {
                    const isSelected = selectedId === item.id;
                    return (
                      <tr key={item.id} className={isSelected ? 'bg-[#fafcff]' : 'bg-white'}>
                        <td className="px-4 py-3 font-medium text-[#11141b]">{item.name}</td>
                        <td className="px-4 py-3 text-[#4a5363]">{item.email}</td>
                        <td className="max-w-[320px] truncate px-4 py-3 text-[#4a5363]">{item.subject}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-1 text-[0.74rem] font-medium ${STATUS_BADGES[item.status]}`}
                          >
                            {formatStatusLabel(item.status)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-[#4a5363]">{item.source}</td>
                        <td className="px-4 py-3 text-[#4a5363]">
                          {formatSubmissionTimestamp(item.createdAt)}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => setSelectedId(item.id)}
                            className="rounded-full border border-[#d9dfeb] bg-white px-3 py-1.5 text-[0.78rem] font-medium text-[#0f1116] transition-colors hover:bg-[#f5f7fb]"
                          >
                            Open
                          </button>
                        </td>
                      </tr>
                    );
                  })}
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

          <div className="rounded-[20px] border border-[#e8ecf4] bg-white p-4 sm:p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-[1.05rem] font-semibold text-[#0f1116]">Submission detail</h2>
              {selectedDetail ? (
                <p className="text-[0.78rem] text-gray-500">ID: {selectedDetail.id}</p>
              ) : null}
            </div>

            {isDetailLoading ? (
              <p className="text-[0.9rem] text-gray-500">Loading detail...</p>
            ) : null}

            {!isDetailLoading && detailError ? (
              <ActionError error={detailError} onRetry={() => setRefreshNonce((value) => value + 1)} />
            ) : null}

            {!isDetailLoading && !detailError && !selectedDetail ? (
              <p className="text-[0.9rem] text-gray-500">Select a submission to review details.</p>
            ) : null}

            {!isDetailLoading && !detailError && selectedDetail ? (
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <p className="text-[0.72rem] uppercase tracking-wide text-gray-500">Name</p>
                    <p className="mt-1 text-[0.88rem] font-medium text-[#11141b]">{selectedDetail.name}</p>
                  </div>
                  <div>
                    <p className="text-[0.72rem] uppercase tracking-wide text-gray-500">Email</p>
                    <p className="mt-1 text-[0.88rem] text-[#4a5363]">{selectedDetail.email}</p>
                  </div>
                  <div>
                    <p className="text-[0.72rem] uppercase tracking-wide text-gray-500">Source</p>
                    <p className="mt-1 text-[0.88rem] text-[#4a5363]">{selectedDetail.source}</p>
                  </div>
                  <div>
                    <p className="text-[0.72rem] uppercase tracking-wide text-gray-500">Submitted</p>
                    <p className="mt-1 text-[0.88rem] text-[#4a5363]">
                      {formatSubmissionTimestamp(selectedDetail.createdAt)}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-[0.72rem] uppercase tracking-wide text-gray-500">Subject</p>
                  <p className="mt-1 text-[0.92rem] font-medium text-[#11141b]">{selectedDetail.subject}</p>
                </div>

                <div>
                  <p className="text-[0.72rem] uppercase tracking-wide text-gray-500">Message</p>
                  <p className="mt-1 whitespace-pre-wrap rounded-xl border border-[#edf1f8] bg-[#fafcff] px-3 py-2 text-[0.88rem] leading-relaxed text-[#2b3240]">
                    {selectedDetail.message}
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="flex flex-col gap-1 text-[0.74rem] font-semibold uppercase tracking-wide text-gray-500">
                    Status
                    <select
                      value={statusDraft}
                      onChange={(event) => setStatusDraft(event.target.value as ContactSubmissionStatus)}
                      className="h-10 rounded-xl border border-[#e3e8f3] bg-white px-3 text-[0.86rem] font-medium text-[#0f1116] outline-none transition-colors focus:border-[#c9d5f0]"
                    >
                      {statusOptions.map((status) => (
                        <option key={status} value={status}>
                          {formatStatusLabel(status)}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="flex flex-col gap-1 text-[0.74rem] font-semibold uppercase tracking-wide text-gray-500">
                    Page path
                    <input
                      type="text"
                      value={selectedDetail.pagePath ?? '—'}
                      readOnly
                      className="h-10 rounded-xl border border-[#e3e8f3] bg-[#f8fafd] px-3 text-[0.86rem] text-[#5f6773] outline-none"
                    />
                  </label>
                </div>

                <label className="flex flex-col gap-1 text-[0.74rem] font-semibold uppercase tracking-wide text-gray-500">
                  Internal note
                  <textarea
                    value={noteDraft}
                    onChange={(event) => setNoteDraft(event.target.value)}
                    rows={4}
                    placeholder="Add internal context or next action..."
                    className="rounded-xl border border-[#e3e8f3] bg-white px-3 py-2 text-[0.86rem] text-[#0f1116] outline-none transition-colors focus:border-[#c9d5f0]"
                  />
                </label>

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[0.78rem] text-gray-500">
                    Last reviewed: {formatSubmissionTimestamp(selectedDetail.reviewedAt)}
                    {selectedDetail.reviewedBy ? ` by ${selectedDetail.reviewedBy.name ?? selectedDetail.reviewedBy.email}` : ''}
                  </p>

                  <button
                    type="button"
                    onClick={saveDetail}
                    disabled={!hasChanges || isSavingDetail}
                    className="rounded-full border border-[#d9dfeb] bg-[#101625] px-4 py-2 text-[0.82rem] font-medium text-white transition-colors hover:bg-[#0b111d] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isSavingDetail ? 'Saving...' : 'Save updates'}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
