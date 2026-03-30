'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  MdArrowBack,
  MdSearch,
  MdArrowDropDown,
  MdArrowDropUp,
  MdTrendingUp,
  MdChevronLeft,
  MdChevronRight,
  MdFilterList,
} from 'react-icons/md';
import { useAdminApi } from '@dashboard/shared/use-admin-api';
import { ActionError } from '@dashboard/shared/action-error';
import { Skeleton } from '@dashboard/shared/skeleton';

const DATE_RANGES = ['7 days', '30 days', '90 days'] as const;
type DateRange = (typeof DATE_RANGES)[number];
type SortControlKey = 'prompt' | 'category' | 'created' | 'views' | 'share';
type SortOption = {
  label: string;
  value: 'viewCount' | 'createdAt' | 'title' | 'category';
  order: 'asc' | 'desc';
  control: Exclude<SortControlKey, 'share'>;
};

const SORT_OPTIONS: SortOption[] = [
  { label: 'Most Views', value: 'viewCount', order: 'desc', control: 'views' },
  { label: 'Least Views', value: 'viewCount', order: 'asc', control: 'views' },
  { label: 'Newest', value: 'createdAt', order: 'desc', control: 'created' },
  { label: 'Oldest', value: 'createdAt', order: 'asc', control: 'created' },
  { label: 'Title (A-Z)', value: 'title', order: 'asc', control: 'prompt' },
  { label: 'Title (Z-A)', value: 'title', order: 'desc', control: 'prompt' },
  { label: 'Category (A-Z)', value: 'category', order: 'asc', control: 'category' },
  { label: 'Category (Z-A)', value: 'category', order: 'desc', control: 'category' },
];

const SORTABLE_HEADERS: Array<{
  label: string;
  value: SortOption['value'];
  control: SortControlKey;
  defaultOrder: SortOption['order'];
  align?: 'left' | 'right';
}> = [
  { label: 'Prompt', value: 'title', control: 'prompt', defaultOrder: 'asc' },
  { label: 'Category', value: 'category', control: 'category', defaultOrder: 'asc' },
  { label: 'Created', value: 'createdAt', control: 'created', defaultOrder: 'desc' },
  { label: 'Views', value: 'viewCount', control: 'views', defaultOrder: 'desc' },
  {
    label: 'Share of Views',
    value: 'viewCount',
    control: 'share',
    defaultOrder: 'desc',
    align: 'right',
  },
];

type AnalyticsPrompt = {
  id: string;
  title: string;
  slug: string;
  viewCount: number;
  createdAt: string;
  share: number;
  primaryCategory?: {
    id: string;
    name: string;
    slug: string;
  };
};

type PaginatedResponse = {
  items: AnalyticsPrompt[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export default function AnalyticsPromptsPage() {
  const { request, status: authStatus } = useAdminApi();
  const [dateRange, setDateRange] = useState<DateRange>('30 days');
  const [isDateOpen, setIsDateOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sortBy, setSortBy] = useState('viewCount');
  const [sortOrder, setSortOrder] = useState('desc');
  const [activeSortControl, setActiveSortControl] = useState<SortControlKey>('views');
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const [isLimitOpen, setIsLimitOpen] = useState(false);

  const [data, setData] = useState<PaginatedResponse | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const closeAllDropdowns = () => {
    setIsDateOpen(false);
    setIsSortOpen(false);
    setIsLimitOpen(false);
  };

  const toggleDateDropdown = () => {
    setIsDateOpen((current) => {
      const next = !current;
      if (next) {
        setIsSortOpen(false);
        setIsLimitOpen(false);
      }
      return next;
    });
  };

  const toggleSortDropdown = () => {
    setIsSortOpen((current) => {
      const next = !current;
      if (next) {
        setIsDateOpen(false);
        setIsLimitOpen(false);
      }
      return next;
    });
  };

  const toggleLimitDropdown = () => {
    setIsLimitOpen((current) => {
      const next = !current;
      if (next) {
        setIsDateOpen(false);
        setIsSortOpen(false);
      }
      return next;
    });
  };

  const applySort = (option: {
    value: SortOption['value'];
    order: SortOption['order'];
    control: SortControlKey;
  }) => {
    setSortBy(option.value);
    setSortOrder(option.order);
    setActiveSortControl(option.control);
    closeAllDropdowns();
    setPage(1);
  };

  const applyHeaderSort = (header: (typeof SORTABLE_HEADERS)[number]) => {
    const nextOrder =
      activeSortControl === header.control && sortBy === header.value
        ? sortOrder === 'asc'
          ? 'desc'
          : 'asc'
        : header.defaultOrder;

    applySort({
      value: header.value,
      order: nextOrder,
      control: header.control,
    });
  };

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  const rangeDays = useMemo(() => {
    if (dateRange === '7 days') return 7;
    if (dateRange === '90 days') return 90;
    return 30;
  }, [dateRange]);

  const fetchPrompts = async () => {
    if (authStatus !== 'authenticated') return;
    setIsLoading(true);
    setLoadError(null);

    const query = new URLSearchParams({
      range: rangeDays.toString(),
      page: page.toString(),
      limit: limit.toString(),
      sortBy,
      sortOrder,
      ...(debouncedSearch ? { search: debouncedSearch } : {}),
    });

    try {
      const payload = await request<PaginatedResponse>(`/api/admin/analytics/prompts?${query}`, {
        actionName: 'dashboard.analytics.prompts.read',
      });
      setData(payload);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : (err as { message?: string }).message;
      setLoadError(message || 'Unable to load prompt analytics.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPrompts();
  }, [authStatus, rangeDays, page, limit, sortBy, sortOrder, debouncedSearch]);

  const currentSortLabel =
    SORT_OPTIONS.find(
      (option) =>
        option.value === sortBy &&
        option.order === sortOrder &&
        (option.control === activeSortControl ||
          (sortBy === 'viewCount' &&
            (activeSortControl === 'views' || activeSortControl === 'share'))),
    )?.label ??
    SORT_OPTIONS.find((option) => option.value === sortBy && option.order === sortOrder)?.label ??
    'Sort';

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/analytics"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-[#e1e5ee] bg-white text-[#5f6773] transition-colors hover:bg-gray-50"
          >
            <MdArrowBack size={20} />
          </Link>
          <div>
            <h1 className="text-[1.5rem] font-medium tracking-tight text-[#0f1116]">
              Prompt Performance
            </h1>
            <p className="text-[0.85rem] text-gray-500">Full analysis of all prompt engagement.</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="flex w-full items-center gap-2 rounded-xl border border-[#e1e5ee] bg-white px-3 py-2 text-[0.9rem] text-[#1b2028] sm:w-[240px]">
            <MdSearch className="text-[#5f6773]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search title..."
              className="w-full bg-transparent outline-none"
            />
          </div>

          {/* Date Range */}
          <div className="relative">
            <button
              type="button"
              onClick={toggleDateDropdown}
              className="inline-flex items-center gap-2 rounded-xl border border-[#e1e5ee] bg-white px-4 py-2 text-[0.85rem] text-[#0f1116] transition-colors hover:bg-gray-50"
            >
              <MdTrendingUp size={16} className="text-[#5f6773]" />
              {dateRange}
              <MdArrowDropDown size={18} />
            </button>
            {isDateOpen && (
              <div className="absolute right-0 top-[calc(100%+6px)] z-20 w-36 rounded-xl border border-[#e2e6ee] bg-white p-1.5 shadow-xl">
                {DATE_RANGES.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => {
                      setDateRange(r);
                      closeAllDropdowns();
                      setPage(1);
                    }}
                    className={`flex w-full items-center rounded-lg px-3 py-2 text-[0.82rem] transition-colors ${
                      dateRange === r
                        ? 'bg-[#d5ea52] text-[#0f1116]'
                        : 'text-[#0f1116] hover:bg-gray-50'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-[24px] border border-[#eef2f6] bg-white shadow-sm overflow-hidden">
        {/* Filters & Sort */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#f0f4f8] p-4 sm:px-6">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <button
                type="button"
                onClick={toggleSortDropdown}
                className="inline-flex items-center gap-2 rounded-lg border border-[#e1e5ee] bg-[#f9fafb] px-3 py-1.5 text-[0.8rem] text-[#4b5563] hover:bg-gray-100 transition-colors"
              >
                <MdFilterList size={14} />
                {currentSortLabel}
                <MdArrowDropDown size={16} />
              </button>
              {isSortOpen && (
                <div className="absolute left-0 top-[calc(100%+6px)] z-20 w-48 rounded-xl border border-[#e2e6ee] bg-white p-1.5 shadow-xl">
                  {SORT_OPTIONS.map((opt) => (
                    <button
                      key={opt.label}
                      type="button"
                      onClick={() => applySort(opt)}
                      className={`flex w-full items-center rounded-lg px-3 py-2 text-[0.82rem] transition-colors ${
                        sortBy === opt.value &&
                        sortOrder === opt.order &&
                        (activeSortControl === opt.control ||
                          (opt.control === 'views' && activeSortControl === 'share'))
                          ? 'bg-[#d5ea52] text-[#0f1116]'
                          : 'text-[#0f1116] hover:bg-gray-50'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={toggleLimitDropdown}
                className="inline-flex items-center gap-2 rounded-lg border border-[#e1e5ee] bg-[#f9fafb] px-3 py-1.5 text-[0.8rem] text-[#4b5563] hover:bg-gray-100 transition-colors"
              >
                Show {limit}
                <MdArrowDropDown size={16} />
              </button>
              {isLimitOpen && (
                <div className="absolute left-0 top-[calc(100%+6px)] z-20 w-24 rounded-xl border border-[#e2e6ee] bg-white p-1.5 shadow-xl">
                  {[10, 15, 30, 50].map((l) => (
                    <button
                      key={l}
                      type="button"
                      onClick={() => {
                        setLimit(l);
                        closeAllDropdowns();
                        setPage(1);
                      }}
                      className={`flex w-full items-center rounded-lg px-3 py-2 text-[0.82rem] transition-colors ${
                        limit === l
                          ? 'bg-[#d5ea52] text-[#0f1116]'
                          : 'text-[#0f1116] hover:bg-gray-50'
                      }`}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <p className="text-[0.82rem] text-gray-500">{data?.total ?? 0} prompts total</p>
        </div>

        {loadError && (
          <div className="p-6">
            <ActionError error={loadError} />
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-left">
            <thead>
              <tr className="text-[0.78rem] font-medium uppercase tracking-wide text-gray-400 border-b border-gray-50">
                {SORTABLE_HEADERS.map((header) => {
                  const isActive = activeSortControl === header.control;
                  const ariaSort = isActive
                    ? sortOrder === 'asc'
                      ? 'ascending'
                      : 'descending'
                    : 'none';

                  return (
                    <th
                      key={header.label}
                      className={`px-6 py-4 ${header.align === 'right' ? 'text-right' : ''}`}
                      aria-sort={ariaSort}
                    >
                      <button
                        type="button"
                        onClick={() => applyHeaderSort(header)}
                        className={`inline-flex items-center gap-1 rounded-md transition-colors hover:text-[#0f1116] ${
                          header.align === 'right' ? 'ml-auto' : ''
                        } ${isActive ? 'text-[#0f1116]' : 'text-gray-400'}`}
                      >
                        <span>{header.label}</span>
                        {isActive ? (
                          sortOrder === 'asc' ? (
                            <MdArrowDropUp size={18} />
                          ) : (
                            <MdArrowDropDown size={18} />
                          )
                        ) : (
                          <MdArrowDropDown size={18} className="opacity-45" />
                        )}
                      </button>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                Array.from({ length: limit }).map((_, idx) => (
                  <tr key={`skeleton-${idx}`}>
                    <td className="px-6 py-4">
                      <Skeleton className="h-4 w-48" />
                    </td>
                    <td className="px-6 py-4">
                      <Skeleton className="h-4 w-24 rounded-full" />
                    </td>
                    <td className="px-6 py-4">
                      <Skeleton className="h-4 w-20" />
                    </td>
                    <td className="px-6 py-4">
                      <Skeleton className="h-4 w-12" />
                    </td>
                    <td className="px-6 py-4">
                      <Skeleton className="h-4 w-10 ml-auto" />
                    </td>
                  </tr>
                ))
              ) : data?.items.length ? (
                data.items.map((prompt) => (
                  <tr key={prompt.id} className="group hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-[0.92rem] font-medium text-[#0f1116]">
                          {prompt.title}
                        </span>
                        <span className="text-[0.72rem] text-gray-400 font-mono">
                          /{prompt.slug}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {prompt.primaryCategory ? (
                        <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[0.7rem] font-medium text-blue-600">
                          {prompt.primaryCategory.name}
                        </span>
                      ) : (
                        <span className="text-[0.75rem] text-gray-400">Uncategorized</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-[0.85rem] text-gray-600">
                      {new Date(prompt.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-[0.85rem] font-medium text-[#0f1116]">
                      {prompt.viewCount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-3 font-medium text-[0.85rem] text-gray-600">
                        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-gray-100">
                          <div
                            className="h-full bg-[#d5ea52]"
                            style={{ width: `${prompt.share}%` }}
                          />
                        </div>
                        <span className="min-w-[32px]">{prompt.share}%</span>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-[0.9rem] text-gray-500">
                    No results found matching your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-[#f0f4f8] bg-[#f9fafb] px-6 py-4">
            <p className="text-[0.82rem] text-gray-500">
              Page {data.page} of {data.totalPages}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#e1e5ee] bg-white text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-40 disabled:hover:bg-white"
              >
                <MdChevronLeft size={20} />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                disabled={page === data.totalPages}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#e1e5ee] bg-white text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-40 disabled:hover:bg-white"
              >
                <MdChevronRight size={20} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
