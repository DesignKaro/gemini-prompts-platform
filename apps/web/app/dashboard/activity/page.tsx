'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { MdAutoAwesome, MdChatBubble, MdCheckCircle, MdRefresh, MdSearch, MdArticle } from 'react-icons/md';
import { useAdminApi } from '../../components/dashboard/use-admin-api';
import { Skeleton } from '../../components/ui/skeleton';
import { buildActivityMessage } from '../../../lib/utils/activity';
import { formatRelativeTime } from '../../../lib/utils/format';

type ActivityLog = {
  id: string;
  action: string;
  targetType: string;
  createdAt: string;
  metadata?: Record<string, unknown> | null;
  actor?: { name: string | null; email: string | null } | null;
};

const PAGE_SIZE = 30;

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
  return 'bg-blue-50 text-blue-600 border-blue-100';
}

export default function ActivityPage() {
  const { request, status } = useAdminApi();
  const [activity, setActivity] = useState<ActivityLog[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const loadPage = useCallback(
    async (pageIndex: number, replace = false) => {
      if (status !== 'authenticated') return;
      setIsLoading(true);
      setLoadError(null);
      try {
        const skip = pageIndex * PAGE_SIZE;
        const payload = await request<{ items: ActivityLog[]; total: number }>(
          `/api/admin/activity?take=${PAGE_SIZE}&skip=${skip}`,
        );
        setTotal(payload.total ?? 0);
        setActivity((prev) =>
          replace ? payload.items ?? [] : [...prev, ...(payload.items ?? [])],
        );
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : (err as { message?: string }).message;
        setLoadError(message || 'Unable to load activity.');
      } finally {
        setIsLoading(false);
      }
    },
    [request, status],
  );

  const initialLoad = useCallback(() => {
    setActivity([]);
    loadPage(0, true).catch(() => undefined);
  }, [loadPage]);

  useEffect(() => {
    if (status !== 'authenticated') return;
    if (activity.length === 0 && !isLoading) {
      initialLoad();
    }
  }, [activity.length, initialLoad, isLoading, status]);

  const filtered = useMemo(() => {
    if (!search.trim()) return activity;
    const needle = search.toLowerCase();
    return activity.filter((item) => {
      const message = buildActivityMessage(item).toLowerCase();
      const action = item.action?.toLowerCase?.() || '';
      const target = item.targetType?.toLowerCase?.() || '';
      const actor = item.actor?.name?.toLowerCase?.() || item.actor?.email?.toLowerCase?.() || '';
      return (
        message.includes(needle) ||
        action.includes(needle) ||
        target.includes(needle) ||
        actor.includes(needle)
      );
    });
  }, [activity, search]);

  const hasMore = activity.length < total;

  const grouped = useMemo(() => {
    const groups = new Map<
      string,
      { key: string; title: string; items: ActivityLog[]; latest: number }
    >();

    filtered.forEach((item) => {
      const key = item.targetType || 'OTHER';
      const title = formatTitleCase(key);
      const createdAt = Date.parse(item.createdAt);
      const existing = groups.get(key);
      if (!existing) {
        groups.set(key, { key, title, items: [item], latest: createdAt });
      } else {
        existing.items.push(item);
        if (createdAt > existing.latest) {
          existing.latest = createdAt;
        }
      }
    });

    return Array.from(groups.values())
      .map((group) => ({
        ...group,
        items: group.items.sort(
          (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
        ),
      }))
      .sort((a, b) => b.latest - a.latest);
  }, [filtered]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[1.8rem] font-medium tracking-tight text-[#0f1116]">Activity</h1>
          <p className="text-[0.95rem] text-gray-500">All activity across your content.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 rounded-full border border-[#e1e5ee] bg-white px-3 py-2 text-[0.85rem] text-[#6b7280]">
            <MdSearch size={16} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search activity..."
              className="w-[180px] border-none bg-transparent text-[0.85rem] text-[#0f1116] outline-none"
            />
          </div>
          <button
            type="button"
            onClick={initialLoad}
            className="inline-flex items-center gap-2 rounded-full border border-[#e1e5ee] bg-white px-4 py-2 text-[0.85rem] font-medium text-[#0f1116] hover:bg-gray-50"
          >
            <MdRefresh size={16} />
            Refresh
          </button>
        </div>
      </div>

      <div className="rounded-[24px] border border-[#eef2f6] bg-white p-5 sm:p-6">
        {loadError && (
          <div className="mb-4 rounded-[12px] border border-red-100 bg-red-50 px-4 py-3 text-[0.85rem] text-red-700">
            {loadError}
          </div>
        )}

        {isLoading && activity.length === 0 && (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={`activity-loading-${index}`} className="flex items-start gap-3 rounded-xl p-2.5">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-1/4" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!isLoading && filtered.length === 0 && (
          <div className="rounded-xl border border-dashed border-[#e1e5ee] bg-[#f9fafb] px-4 py-6 text-center text-[0.9rem] text-gray-500">
            No activity to show yet.
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
                  <span className="text-[0.95rem] font-medium text-[#0f1116]">
                    {group.title}
                  </span>
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
                      const label =
                        (item.metadata?.title as string | undefined) ||
                        (item.metadata?.name as string | undefined) ||
                        item.targetType?.toLowerCase() ||
                        'activity';
                      const { icon, color } = activityIcon(item.targetType);
                      return (
                        <tr key={item.id} className="border-t border-[#eef2f6]">
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <span className={`flex h-7 w-7 items-center justify-center rounded-full ${color}`}>
                            {icon}
                          </span>
                          <span className="truncate font-medium">{actorName}</span>
                        </div>
                      </td>
                      <td className="py-3">
                        <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-[0.7rem] ${actionBadge(item.action)}`}>
                          {item.action}
                        </span>
                      </td>
                      <td className="py-3">
                        <span className="truncate text-[#0f1116]">{label}</span>
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
              onClick={() => loadPage(Math.ceil(activity.length / PAGE_SIZE))}
              disabled={isLoading}
              className="rounded-full border border-[#e1e5ee] bg-white px-5 py-2 text-[0.85rem] font-medium text-[#0f1116] hover:bg-gray-50 disabled:opacity-60"
            >
              {isLoading ? 'Loading...' : 'Load more'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
