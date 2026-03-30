'use client';

import type { ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  MdAccessTime,
  MdArrowDropDown,
  MdArticle,
  MdAutoAwesome,
  MdChatBubble,
  MdCheckCircle,
  MdClose,
  MdFilterList,
  MdRefresh,
  MdSearch,
  MdSort,
} from 'react-icons/md';
import { useAdminApi } from '../../components/dashboard/use-admin-api';
import { ActionError } from '../../components/dashboard/action-error';
import { Skeleton } from '../../components/ui/skeleton';
import { formatRelativeTime } from '../../../lib/utils/format';

type ActivityLog = {
  id: string;
  action: string;
  targetType: string;
  createdAt: string;
  metadata?: Record<string, unknown> | null;
  actor?: { id?: string | null; name: string | null; email: string | null } | null;
};

type ActivityResponse = {
  items: ActivityLog[];
  total: number;
};

type ActivityAction =
  | ''
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'PUBLISH'
  | 'UNPUBLISH'
  | 'ARCHIVE'
  | 'RESTORE';

type ActivityTargetType =
  | ''
  | 'PROMPT'
  | 'POST'
  | 'CATEGORY'
  | 'TAG'
  | 'COMMENT'
  | 'MEDIA'
  | 'USER';

type ActivitySortOrder = 'asc' | 'desc';
type ActivityRangeValue = '' | '1' | '7' | '30' | '90';
type ActivityDropdownKey = 'action' | 'type' | 'range' | 'sort' | null;

type FilterOption<T extends string> = {
  label: string;
  value: T;
};

const PAGE_SIZE = 30;

const ACTION_OPTIONS: FilterOption<ActivityAction>[] = [
  { label: 'All actions', value: '' },
  { label: 'Create', value: 'CREATE' },
  { label: 'Update', value: 'UPDATE' },
  { label: 'Delete', value: 'DELETE' },
  { label: 'Publish', value: 'PUBLISH' },
  { label: 'Unpublish', value: 'UNPUBLISH' },
  { label: 'Archive', value: 'ARCHIVE' },
  { label: 'Restore', value: 'RESTORE' },
];

const TARGET_TYPE_OPTIONS: FilterOption<ActivityTargetType>[] = [
  { label: 'All types', value: '' },
  { label: 'Prompt', value: 'PROMPT' },
  { label: 'Post', value: 'POST' },
  { label: 'Category', value: 'CATEGORY' },
  { label: 'Tag', value: 'TAG' },
  { label: 'Comment', value: 'COMMENT' },
  { label: 'Media', value: 'MEDIA' },
  { label: 'User', value: 'USER' },
];

const RANGE_OPTIONS: FilterOption<ActivityRangeValue>[] = [
  { label: 'All time', value: '' },
  { label: 'Today', value: '1' },
  { label: 'Last 7 days', value: '7' },
  { label: 'Last 30 days', value: '30' },
  { label: 'Last 90 days', value: '90' },
];

const SORT_OPTIONS: FilterOption<ActivitySortOrder>[] = [
  { label: 'Newest first', value: 'desc' },
  { label: 'Oldest first', value: 'asc' },
];

function formatTitleCase(value?: string | null) {
  if (!value) return 'Activity';
  return value
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function activityIcon(targetType?: string | null) {
  const lowerTarget = targetType?.toLowerCase?.() || '';
  if (lowerTarget.includes('comment')) {
    return { icon: <MdChatBubble size={16} />, color: 'bg-orange-100 text-orange-700' };
  }
  if (lowerTarget.includes('post')) {
    return { icon: <MdArticle size={16} />, color: 'bg-purple-100 text-purple-700' };
  }
  if (lowerTarget.includes('prompt')) {
    return { icon: <MdAutoAwesome size={16} />, color: 'bg-[#d5ea52] text-[#0f1116]' };
  }
  return { icon: <MdCheckCircle size={16} />, color: 'bg-green-100 text-green-700' };
}

function actionBadge(action?: string | null) {
  const normalized = action?.toUpperCase?.() || 'UPDATE';
  if (normalized === 'DELETE') return 'bg-red-50 text-red-600 border-red-100';
  if (normalized === 'CREATE') return 'bg-green-50 text-green-600 border-green-100';
  if (normalized === 'PUBLISH' || normalized === 'UNPUBLISH') {
    return 'bg-[#eef6c8] text-[#516114] border-[#dce9a2]';
  }
  return 'bg-blue-50 text-blue-600 border-blue-100';
}

function getItemLabel(item: ActivityLog) {
  return (
    (item.metadata?.title as string | undefined) ||
    (item.metadata?.name as string | undefined) ||
    (item.metadata?.url as string | undefined) ||
    item.targetType?.toLowerCase() ||
    'activity'
  );
}

function getOptionLabel<T extends string>(options: FilterOption<T>[], value: T) {
  return options.find((option) => option.value === value)?.label ?? options[0]?.label ?? '';
}

function FilterDropdown<T extends string>({
  label,
  value,
  options,
  isOpen,
  onToggle,
  onSelect,
  icon,
  widthClass = 'w-44',
}: {
  label: string;
  value: T;
  options: FilterOption<T>[];
  isOpen: boolean;
  onToggle: () => void;
  onSelect: (value: T) => void;
  icon: ReactNode;
  widthClass?: string;
}) {
  return (
    <div className="relative">
      <button
        type="button"
        onClick={onToggle}
        className="inline-flex items-center gap-2 rounded-full border border-[#e1e5ee] bg-white px-3 py-2 text-[0.82rem] text-[#0f1116] transition-colors hover:bg-gray-50"
      >
        <span className="text-[#6b7280]">{icon}</span>
        <span>{label}</span>
        <MdArrowDropDown size={18} className="text-[#6b7280]" />
      </button>
      {isOpen && (
        <div
          className={`absolute left-0 top-[calc(100%+8px)] z-20 ${widthClass} rounded-[18px] border border-[#e2e6ee] bg-white p-1.5 shadow-xl`}
        >
          {options.map((option) => (
            <button
              key={`${label}-${option.value || 'all'}`}
              type="button"
              onClick={() => onSelect(option.value)}
              className={`flex w-full items-center rounded-[14px] px-3 py-2 text-left text-[0.82rem] transition-colors ${
                value === option.value
                  ? 'bg-[#d5ea52] text-[#0f1116]'
                  : 'text-[#0f1116] hover:bg-gray-50'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ActivityPage() {
  const { request, status } = useAdminApi();
  const [activity, setActivity] = useState<ActivityLog[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedAction, setSelectedAction] = useState<ActivityAction>('');
  const [selectedTargetType, setSelectedTargetType] = useState<ActivityTargetType>('');
  const [selectedRange, setSelectedRange] = useState<ActivityRangeValue>('');
  const [sortOrder, setSortOrder] = useState<ActivitySortOrder>('desc');
  const [activeDropdown, setActiveDropdown] = useState<ActivityDropdownKey>(null);
  const requestIdRef = useRef(0);
  const filtersRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim().replace(/\s+/g, ' '));
    }, 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (!activeDropdown) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (filtersRef.current && !filtersRef.current.contains(event.target as Node)) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [activeDropdown]);

  const buildQueryString = useCallback(
    (pageIndex: number) => {
      const params = new URLSearchParams();
      params.set('take', String(PAGE_SIZE));
      params.set('skip', String(pageIndex * PAGE_SIZE));
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (selectedAction) params.set('action', selectedAction);
      if (selectedTargetType) params.set('targetType', selectedTargetType);
      if (selectedRange) params.set('rangeDays', selectedRange);
      params.set('sortOrder', sortOrder);
      return params.toString();
    },
    [debouncedSearch, selectedAction, selectedTargetType, selectedRange, sortOrder],
  );

  const fetchPage = useCallback(
    async (pageIndex: number, replace: boolean, signal?: AbortSignal) => {
      if (status !== 'authenticated') return;
      const requestId = ++requestIdRef.current;

      if (replace) {
        setIsLoading(true);
        setIsLoadingMore(false);
        setActivity([]);
        setTotal(0);
      } else {
        setIsLoadingMore(true);
      }

      setLoadError(null);

      try {
        const payload = await request<ActivityResponse>(
          `/api/admin/activity?${buildQueryString(pageIndex)}`,
          {
            actionName: 'dashboard.activity.list',
            signal,
          },
        );
        if (requestIdRef.current !== requestId) return;

        const nextItems = payload.items ?? [];
        setTotal(payload.total ?? 0);
        setActivity((prev) => (replace ? nextItems : [...prev, ...nextItems]));
      } catch (err: unknown) {
        if (requestIdRef.current !== requestId) return;
        if (err instanceof Error && err.name === 'AbortError') return;
        const message = err instanceof Error ? err.message : (err as { message?: string }).message;
        setLoadError(message || 'Unable to load activity.');
      } finally {
        if (requestIdRef.current === requestId) {
          setIsLoading(false);
          setIsLoadingMore(false);
        }
      }
    },
    [buildQueryString, request, status],
  );

  useEffect(() => {
    if (status !== 'authenticated') return;
    const controller = new AbortController();
    fetchPage(0, true, controller.signal).catch(() => undefined);
    return () => controller.abort();
  }, [fetchPage, status]);

  const handleRefresh = () => {
    setActiveDropdown(null);
    fetchPage(0, true).catch(() => undefined);
  };

  const handleLoadMore = () => {
    if (isLoading || isLoadingMore) return;
    const nextPageIndex = Math.ceil(activity.length / PAGE_SIZE);
    fetchPage(nextPageIndex, false).catch(() => undefined);
  };

  const clearFilters = () => {
    setSearch('');
    setDebouncedSearch('');
    setSelectedAction('');
    setSelectedTargetType('');
    setSelectedRange('');
    setSortOrder('desc');
    setActiveDropdown(null);
  };

  const hasMore = activity.length < total;
  const hasActiveFilters = Boolean(
    debouncedSearch || selectedAction || selectedTargetType || selectedRange || sortOrder !== 'desc',
  );

  const filterChips = useMemo(() => {
    const chips: string[] = [];
    if (debouncedSearch) chips.push(`Search: ${debouncedSearch}`);
    if (selectedAction) chips.push(`Action: ${getOptionLabel(ACTION_OPTIONS, selectedAction)}`);
    if (selectedTargetType) {
      chips.push(`Type: ${getOptionLabel(TARGET_TYPE_OPTIONS, selectedTargetType)}`);
    }
    if (selectedRange) chips.push(`Time: ${getOptionLabel(RANGE_OPTIONS, selectedRange)}`);
    if (sortOrder !== 'desc') chips.push(`Sort: ${getOptionLabel(SORT_OPTIONS, sortOrder)}`);
    return chips;
  }, [debouncedSearch, selectedAction, selectedRange, selectedTargetType, sortOrder]);

  const grouped = useMemo(() => {
    const groups = new Map<
      string,
      { key: string; title: string; items: ActivityLog[]; latest: number; earliest: number }
    >();

    activity.forEach((item) => {
      const key = item.targetType || 'OTHER';
      const title = formatTitleCase(key);
      const createdAt = Date.parse(item.createdAt);
      const existing = groups.get(key);
      if (!existing) {
        groups.set(key, {
          key,
          title,
          items: [item],
          latest: createdAt,
          earliest: createdAt,
        });
      } else {
        existing.items.push(item);
        existing.latest = Math.max(existing.latest, createdAt);
        existing.earliest = Math.min(existing.earliest, createdAt);
      }
    });

    return Array.from(groups.values())
      .map((group) => ({
        ...group,
        items: group.items.sort((left, right) =>
          sortOrder === 'asc'
            ? Date.parse(left.createdAt) - Date.parse(right.createdAt)
            : Date.parse(right.createdAt) - Date.parse(left.createdAt),
        ),
      }))
      .sort((left, right) =>
        sortOrder === 'asc'
          ? left.earliest - right.earliest
          : right.latest - left.latest,
      );
  }, [activity, sortOrder]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <h1 className="text-[1.8rem] font-medium tracking-tight text-[#0f1116]">Activity</h1>
          <p className="text-[0.95rem] text-gray-500">
            Search and filter audit activity across prompts, posts, taxonomy, users, and more.
          </p>
        </div>

        <div ref={filtersRef} className="flex flex-wrap items-center gap-2 xl:justify-end">
          <div className="flex items-center gap-2 rounded-full border border-[#e1e5ee] bg-white px-3 py-2 text-[0.85rem] text-[#6b7280] focus-within:border-[#0f1116]">
            <MdSearch size={16} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onFocus={() => setActiveDropdown(null)}
              placeholder="Search actor, item, action, type..."
              className="w-[220px] border-none bg-transparent text-[0.85rem] text-[#0f1116] outline-none sm:w-[260px]"
            />
          </div>

          <FilterDropdown
            label={getOptionLabel(ACTION_OPTIONS, selectedAction)}
            value={selectedAction}
            options={ACTION_OPTIONS}
            isOpen={activeDropdown === 'action'}
            onToggle={() =>
              setActiveDropdown((current) => (current === 'action' ? null : 'action'))
            }
            onSelect={(value) => {
              setSelectedAction(value);
              setActiveDropdown(null);
            }}
            icon={<MdFilterList size={16} />}
          />

          <FilterDropdown
            label={getOptionLabel(TARGET_TYPE_OPTIONS, selectedTargetType)}
            value={selectedTargetType}
            options={TARGET_TYPE_OPTIONS}
            isOpen={activeDropdown === 'type'}
            onToggle={() => setActiveDropdown((current) => (current === 'type' ? null : 'type'))}
            onSelect={(value) => {
              setSelectedTargetType(value);
              setActiveDropdown(null);
            }}
            icon={<MdFilterList size={16} />}
          />

          <FilterDropdown
            label={getOptionLabel(RANGE_OPTIONS, selectedRange)}
            value={selectedRange}
            options={RANGE_OPTIONS}
            isOpen={activeDropdown === 'range'}
            onToggle={() =>
              setActiveDropdown((current) => (current === 'range' ? null : 'range'))
            }
            onSelect={(value) => {
              setSelectedRange(value);
              setActiveDropdown(null);
            }}
            icon={<MdAccessTime size={16} />}
          />

          <FilterDropdown
            label={getOptionLabel(SORT_OPTIONS, sortOrder)}
            value={sortOrder}
            options={SORT_OPTIONS}
            isOpen={activeDropdown === 'sort'}
            onToggle={() => setActiveDropdown((current) => (current === 'sort' ? null : 'sort'))}
            onSelect={(value) => {
              setSortOrder(value);
              setActiveDropdown(null);
            }}
            icon={<MdSort size={16} />}
            widthClass="w-40"
          />

          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex items-center gap-2 rounded-full border border-[#e1e5ee] bg-white px-3 py-2 text-[0.82rem] font-medium text-[#0f1116] transition-colors hover:bg-gray-50"
            >
              <MdClose size={16} />
              Clear
            </button>
          )}

          <button
            type="button"
            onClick={handleRefresh}
            className="inline-flex items-center gap-2 rounded-full border border-[#e1e5ee] bg-white px-4 py-2 text-[0.85rem] font-medium text-[#0f1116] hover:bg-gray-50"
          >
            <MdRefresh size={16} />
            Refresh
          </button>
        </div>
      </div>

      <div className="rounded-[24px] border border-[#eef2f6] bg-white p-5 sm:p-6">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            {filterChips.length > 0 ? (
              filterChips.map((chip) => (
                <span
                  key={chip}
                  className="rounded-full bg-[#f5f7fb] px-3 py-1 text-[0.76rem] text-[#4b5563]"
                >
                  {chip}
                </span>
              ))
            ) : (
              <span className="rounded-full bg-[#f5f7fb] px-3 py-1 text-[0.76rem] text-[#4b5563]">
                All activity
              </span>
            )}
          </div>
          <p className="text-[0.82rem] text-gray-500">
            Showing {activity.length} of {total} activity record{total === 1 ? '' : 's'}
          </p>
        </div>

        {loadError && (
          <div className="mb-4">
            <ActionError error={loadError} />
          </div>
        )}

        {isLoading && activity.length === 0 && (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={`activity-loading-${index}`}
                className="flex items-start gap-3 rounded-xl p-2.5"
              >
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-1/4" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!isLoading && activity.length === 0 && (
          <div className="rounded-xl border border-dashed border-[#e1e5ee] bg-[#f9fafb] px-4 py-6 text-center text-[0.9rem] text-gray-500">
            {hasActiveFilters
              ? 'No activity matched your current search and filters.'
              : 'No activity to show yet.'}
          </div>
        )}

        <div className="space-y-6">
          {grouped.map((group) => (
            <div
              key={group.key}
              className="rounded-[20px] border border-[#eef2f6] bg-[#fbfcff] p-4 sm:p-5"
            >
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[0.95rem] font-medium text-[#0f1116]">{group.title}</span>
                  <span className="rounded-full bg-white px-2 py-0.5 text-[0.7rem] text-gray-500">
                    {group.items.length}
                  </span>
                </div>
              </div>

              <div className="w-full overflow-x-auto">
                <table className="w-full min-w-[640px] table-fixed text-left text-[0.85rem]">
                  <colgroup>
                    <col className="w-[28%]" />
                    <col className="w-[14%]" />
                    <col className="w-[28%]" />
                    <col className="w-[15%]" />
                    <col className="w-[15%]" />
                  </colgroup>
                  <thead className="text-[0.7rem] uppercase tracking-wide text-gray-400">
                    <tr>
                      <th className="pb-3 font-medium">Actor</th>
                      <th className="pb-3 font-medium">Action</th>
                      <th className="pb-3 font-medium">Item</th>
                      <th className="pb-3 font-medium">Type</th>
                      <th className="pb-3 text-right font-medium">Time</th>
                    </tr>
                  </thead>
                  <tbody className="text-[#0f1116]">
                    {group.items.map((item) => {
                      const actorName = item.actor?.name || item.actor?.email || 'System';
                      const label = getItemLabel(item);
                      const { icon, color } = activityIcon(item.targetType);
                      return (
                        <tr key={item.id} className="border-t border-[#eef2f6]">
                          <td className="py-3">
                            <div className="flex items-center gap-2">
                              <span
                                className={`flex h-7 w-7 items-center justify-center rounded-full ${color}`}
                              >
                                {icon}
                              </span>
                              <span className="truncate font-medium">{actorName}</span>
                            </div>
                          </td>
                          <td className="py-3">
                            <span
                              className={`inline-flex rounded-full border px-2.5 py-0.5 text-[0.7rem] ${actionBadge(item.action)}`}
                            >
                              {item.action}
                            </span>
                          </td>
                          <td className="py-3">
                            <span className="block truncate text-[#0f1116]">{label}</span>
                          </td>
                          <td className="py-3 text-gray-500">
                            {item.targetType?.toLowerCase() ?? 'activity'}
                          </td>
                          <td className="py-3 text-right text-gray-400">
                            {formatRelativeTime(item.createdAt)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>

        {hasMore && (
          <div className="mt-6 flex justify-center">
            <button
              type="button"
              onClick={handleLoadMore}
              disabled={isLoading || isLoadingMore}
              className="rounded-full border border-[#e1e5ee] bg-white px-5 py-2 text-[0.85rem] font-medium text-[#0f1116] hover:bg-gray-50 disabled:opacity-60"
            >
              {isLoadingMore ? 'Loading...' : 'Load more'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
