'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  MdSearch,
  MdFilterList,
  MdAdd,
  MdCircle,
  MdEdit,
  MdDeleteOutline,
  MdVisibility,
} from 'react-icons/md';
import { useAdminApi } from '../../../components/dashboard/use-admin-api';
import { ActionError } from '../../../components/dashboard/action-error';
import { bulkActionMessage, runBulkAction } from '../../../components/dashboard/bulk-action';
import { InlineSpinner } from '../../../components/ui/inline-spinner';
import { LoadingButton } from '../../../components/ui/loading-button';
import { formatRelativeTimeOrDash, titleCase } from '../../../../lib/utils/format';

type ApiPostStatus = 'DRAFT' | 'SCHEDULED' | 'PUBLISHED' | 'ARCHIVED';
type ApiVisibility = 'FREE' | 'EXCLUSIVE';

type Post = {
  id: string;
  title: string;
  slug: string;
  postType?: string | null;
  postFormat?: string | null;
  status: ApiPostStatus;
  visibility: ApiVisibility;
  views: number;
  updatedAt: string;
  updatedAtISO: string;
};

type PostResponse = {
  items: Array<{
    id: string;
    title: string;
    slug: string;
    status: ApiPostStatus;
    visibility: ApiVisibility;
    updatedAt: string;
    createdAt: string;
    viewCount?: number | null;
    postType?: string | null;
    postFormat?: string | null;
  }>;
  total: number;
};

const STATUS_TABS = ['All', 'Published', 'Draft', 'Scheduled'] as const;
type StatusTab = (typeof STATUS_TABS)[number];

function statusStyle(statusLabel: string) {
  if (statusLabel === 'Published') return 'bg-green-50 text-green-600';
  if (statusLabel === 'Private') return 'bg-purple-50 text-purple-600';
  if (statusLabel === 'Draft') return 'bg-gray-100 text-gray-600';
  if (statusLabel === 'Scheduled') return 'bg-blue-50 text-blue-600';
  return 'bg-gray-100 text-gray-600';
}

function getStatusLabel(status: ApiPostStatus, visibility: ApiVisibility) {
  if (status === 'PUBLISHED' && visibility === 'EXCLUSIVE') return 'Private';
  if (status === 'PUBLISHED') return 'Published';
  if (status === 'SCHEDULED') return 'Scheduled';
  if (status === 'ARCHIVED') return 'Archived';
  return 'Draft';
}

export default function PostsManagementPage() {
  const { request, status: authStatus, isPending } = useAdminApi();
  const [posts, setPosts] = useState<Post[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<StatusTab>('All');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [sortFilter, setSortFilter] = useState<'recent' | 'views' | 'az'>('recent');
  const requestIdRef = useRef(0);
  const isBulkStatusPending = isPending('dashboard.posts.bulk.status.update');
  const isBulkDeletePending = isPending('dashboard.posts.bulk.delete');
  const isAnyBulkPending = isBulkStatusPending || isBulkDeletePending;

  useEffect(() => {
    if (authStatus !== 'authenticated') return;
    const requestId = ++requestIdRef.current;
    const controller = new AbortController();

    const timer = window.setTimeout(() => {
      setIsLoading(true);
      setLoadError(null);
      const params = new URLSearchParams();
      params.set('take', '200');
      params.set('skip', '0');
      const trimmedSearch = search.trim();
      if (trimmedSearch) params.set('search', trimmedSearch);
      if (activeTab !== 'All') {
        const mappedStatus =
          activeTab === 'Published' ? 'PUBLISHED' : activeTab === 'Draft' ? 'DRAFT' : 'SCHEDULED';
        params.set('status', mappedStatus);
      }
      params.set('sort', sortFilter);

      request<PostResponse>(`/api/admin/posts?${params.toString()}`, {
        actionName: 'dashboard.posts.list',
        signal: controller.signal,
      })
        .then((payload) => {
          if (requestIdRef.current !== requestId) return;
          const items = payload.items ?? [];
          const mapped = items.map((item) => {
            const updatedAtValue = item.updatedAt || item.createdAt;
            return {
              id: item.id,
              title: item.title,
              slug: item.slug,
              postType: item.postType ?? null,
              postFormat: item.postFormat ?? null,
              status: item.status,
              visibility: item.visibility,
              views: item.viewCount ?? 0,
              updatedAt: formatRelativeTimeOrDash(updatedAtValue),
              updatedAtISO: updatedAtValue,
            } satisfies Post;
          });
          setPosts(mapped);
          setTotal(payload.total ?? mapped.length);
        })
        .catch((err: Error) => {
          if (requestIdRef.current !== requestId) return;
          if (err?.name === 'AbortError') return;
          setLoadError(err.message || 'Unable to load posts.');
        })
        .finally(() => {
          if (requestIdRef.current !== requestId) return;
          setIsLoading(false);
        });
    }, 250);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [activeTab, authStatus, request, search, sortFilter]);

  const trashPost = async (id: string) => {
    if (isPending(`dashboard.posts.delete:${id}`)) return;
    try {
      await request(`/api/admin/posts/${id}`, {
        method: 'DELETE',
        actionName: 'dashboard.posts.delete',
        pendingKey: `dashboard.posts.delete:${id}`,
      });
      setPosts((prev) => prev.filter((p) => p.id !== id));
      setSelectedIds((prev) => prev.filter((item) => item !== id));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to delete post.';
      setLoadError(message);
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  };

  const handleBulkStatusChange = async (nextStatus: 'Published' | 'Draft' | 'Scheduled') => {
    if (isBulkStatusPending) return;
    const mappedStatus =
      nextStatus === 'Published' ? 'PUBLISHED' : nextStatus === 'Draft' ? 'DRAFT' : 'SCHEDULED';
    try {
      const result = await runBulkAction({
        ids: selectedIds,
        actionLabel: `Set ${nextStatus}`,
        run: (id) =>
          request(`/api/admin/posts/${id}`, {
            method: 'PATCH',
            actionName: 'dashboard.posts.status.update',
            pendingKey: 'dashboard.posts.bulk.status.update',
            body: JSON.stringify({ status: mappedStatus }),
          }).then(() => undefined),
      });
      const failedIds = new Set(result.failures.map((entry) => entry.id));
      setPosts((prev) =>
        prev.map((post) =>
          selectedIds.includes(post.id) && !failedIds.has(post.id)
            ? { ...post, status: mappedStatus }
            : post,
        ),
      );
      setSelectedIds(Array.from(failedIds));
      setLoadError(bulkActionMessage(result, `Set ${nextStatus}`));
      if (result.failureCount === 0) {
        setIsBulkOpen(false);
        setIsSelectMode(false);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to update posts.';
      setLoadError(message);
    }
  };

  const handleBulkDelete = async () => {
    if (isBulkDeletePending) return;
    try {
      const result = await runBulkAction({
        ids: selectedIds,
        actionLabel: 'Delete',
        run: (id) =>
          request(`/api/admin/posts/${id}`, {
            method: 'DELETE',
            actionName: 'dashboard.posts.delete',
            pendingKey: 'dashboard.posts.bulk.delete',
          }).then(() => undefined),
      });
      const failedIds = new Set(result.failures.map((entry) => entry.id));
      setPosts((prev) => prev.filter((post) => !selectedIds.includes(post.id) || failedIds.has(post.id)));
      setSelectedIds(Array.from(failedIds));
      setLoadError(bulkActionMessage(result, 'Delete'));
      if (result.failureCount === 0) {
        setIsBulkOpen(false);
        setIsSelectMode(false);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to delete selected posts.';
      setLoadError(message);
    }
  };

  const filtered = posts.filter((p) => {
    const matchesTab =
      activeTab === 'All' ||
      (activeTab === 'Published' && p.status === 'PUBLISHED') ||
      (activeTab === 'Draft' && p.status === 'DRAFT') ||
      (activeTab === 'Scheduled' && p.status === 'SCHEDULED');
    const matchesSearch =
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      titleCase(p.postFormat ?? p.postType ?? '')
        .toLowerCase()
        .includes(search.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const allSelected = filtered.length > 0 && selectedIds.length === filtered.length;

  const toggleSelectAll = () => {
    setSelectedIds(allSelected ? [] : filtered.map((item) => item.id));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[1.8rem] font-medium tracking-tight text-[#0f1116]">Posts</h1>
          <p className="text-[0.95rem] text-gray-500">
            Manage long-form posts, guides, and prompt collections.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 sm:gap-3">
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsFilterOpen((v) => !v)}
              className="inline-flex items-center gap-2 rounded-xl border border-[#e1e5ee] bg-white px-3 py-2 text-[0.85rem] font-medium text-[#0f1116] shadow-sm hover:bg-gray-50 transition-colors"
            >
              <MdFilterList size={18} />
              Filters
            </button>
            {isFilterOpen && (
              <div className="absolute right-0 top-[calc(100%+6px)] z-20 w-52 rounded-[14px] border border-[#e2e6ee] bg-white p-3 shadow-xl">
                <p className="mb-2 text-[0.75rem] font-medium uppercase tracking-wide text-gray-400">
                  Sort by
                </p>
                {[
                  { label: 'Latest updated', value: 'recent' },
                  { label: 'Most views', value: 'views' },
                  { label: 'Title A–Z', value: 'az' },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      setSortFilter(opt.value as 'recent' | 'views' | 'az');
                      setIsFilterOpen(false);
                    }}
                    className="flex w-full rounded-[8px] px-3 py-2 text-[0.82rem] text-[#0f1116] hover:bg-gray-50 transition-colors text-left"
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          {isSelectMode ? (
            <>
              <button
                type="button"
                onClick={() => {
                  setIsSelectMode(false);
                  setSelectedIds([]);
                }}
                className="inline-flex items-center gap-2 rounded-xl border border-[#e1e5ee] bg-white px-4 py-2 text-[0.85rem] font-medium text-[#0f1116] shadow-sm hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <div className="relative">
                <LoadingButton
                  type="button"
                  onClick={() => setIsBulkOpen((v) => !v)}
                  pending={isAnyBulkPending}
                  pendingLabel="Processing…"
                  spinnerSize="xs"
                  disabled={selectedIds.length === 0}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#0f1116] px-4 py-2 text-[0.85rem] font-medium text-white shadow-sm hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Bulk actions {selectedIds.length > 0 && `(${selectedIds.length})`}
                </LoadingButton>
                {isBulkOpen && selectedIds.length > 0 && (
                  <div className="absolute right-0 top-[calc(100%+6px)] z-20 w-52 rounded-[14px] border border-[#e2e6ee] bg-white p-1.5 shadow-xl">
                    {STATUS_TABS.filter((t) => t !== 'All').map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() =>
                          handleBulkStatusChange(opt as 'Published' | 'Draft' | 'Scheduled')
                        }
                        disabled={isAnyBulkPending}
                        className="flex w-full items-center rounded-[10px] px-3 py-2 text-[0.82rem] hover:bg-gray-50 transition-colors text-left text-[#0f1116]"
                      >
                        Set {opt}
                      </button>
                    ))}
                    <div className="my-1 border-t border-gray-100" />
                    <button
                      type="button"
                      onClick={handleBulkDelete}
                      disabled={isAnyBulkPending}
                      className="flex w-full items-center rounded-[10px] px-3 py-2 text-[0.82rem] hover:bg-red-50 transition-colors text-left text-[#b94a4a]"
                    >
                      Delete permanently
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setIsSelectMode(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-[#e1e5ee] bg-white px-4 py-2 text-[0.85rem] font-medium text-[#0f1116] shadow-sm hover:bg-gray-50 transition-colors"
            >
              Select
            </button>
          )}
          <Link
            href="/dashboard/content/new?type=post"
            className="inline-flex items-center gap-2 rounded-xl bg-[#d5ea52] px-4 py-2 text-[0.85rem] font-medium text-[#0f1116] shadow-sm hover:opacity-90 transition-opacity"
          >
            <MdAdd size={18} />
            New Post
          </Link>
        </div>
      </div>

      {loadError && <ActionError error={loadError} />}

      <div className="rounded-[24px] border border-[#e2e6ee] bg-white p-4 sm:p-5">
        {/* Search + tabs */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-xs">
            <MdSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search posts…"
              className="w-full rounded-[999px] border border-[#e1e5ee] bg-white py-2.5 pl-9 pr-3 text-[0.85rem] text-[#0f1116] placeholder:text-gray-400 focus:border-[#0f1116] focus:outline-none focus:ring-1 focus:ring-[#0f1116]/10"
            />
          </div>

          <div className="flex flex-wrap gap-2 text-[0.8rem]">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`rounded-full px-3 py-1.5 transition-colors ${
                  activeTab === tab
                    ? 'bg-[#0f1116] text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-3 text-[0.8rem] text-gray-400">
          {isLoading ? 'Loading posts…' : `Showing ${filtered.length} of ${total} posts`}
        </div>

        {/* Table */}
        {filtered.length > 0 ? (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[640px] text-left border-collapse">
              <thead>
                <tr className="text-[0.78rem] font-medium uppercase tracking-wide text-gray-400 border-b border-gray-50">
                  {isSelectMode && (
                    <th className="pb-3 w-10">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={toggleSelectAll}
                        className="h-4 w-4 rounded border-[#d7dbe5] accent-[#0f1116]"
                      />
                    </th>
                  )}
                  <th className="pb-3">Title</th>
                  <th className="pb-3">Type</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 text-right">Views</th>
                  <th className="pb-3 text-right">Last updated</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((post) => (
                  <tr
                    key={post.id}
                    className={`group hover:bg-gray-50 transition-colors ${selectedIds.includes(post.id) ? 'bg-gray-50/50' : ''}`}
                  >
                    {isSelectMode && (
                      <td className="py-4 w-10">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(post.id)}
                          onChange={() => toggleSelection(post.id)}
                          className="h-4 w-4 rounded border-[#d7dbe5] accent-[#0f1116]"
                        />
                      </td>
                    )}
                    <td className="py-4">
                      <span className="text-[0.95rem] font-medium text-[#0f1116]">
                        {post.title}
                      </span>
                    </td>
                    <td className="py-4 text-[0.85rem] text-gray-500">
                      {titleCase(post.postFormat ?? post.postType ?? 'Post')}
                    </td>
                    <td className="py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.7rem] font-medium uppercase tracking-wide ${statusStyle(
                          getStatusLabel(post.status, post.visibility),
                        )}`}
                      >
                        <MdCircle size={8} />
                        {getStatusLabel(post.status, post.visibility)}
                      </span>
                    </td>
                    <td className="py-4 text-right text-[0.85rem] font-medium text-[#0f1116]">
                      {post.views.toLocaleString()}
                    </td>
                    <td className="py-4 text-right text-[0.8rem] text-gray-500 whitespace-nowrap">
                      {post.updatedAt}
                    </td>
                    <td className="py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        {post.status === 'PUBLISHED' ? (
                          <Link
                            href={`/blog/${post.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 hover:text-[#0f1116] transition-colors"
                            title="View live post"
                          >
                            <MdVisibility size={16} />
                          </Link>
                        ) : (
                          <span
                            className="flex h-7 w-7 items-center justify-center rounded-full text-gray-300 cursor-not-allowed"
                            title="Publish this post to view it live"
                            aria-hidden="true"
                          >
                            <MdVisibility size={16} />
                          </span>
                        )}
                        <Link
                          href={`/dashboard/content/new?edit=${post.id}&type=post`}
                          className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 hover:text-[#0f1116] transition-colors"
                          title="Edit"
                        >
                          <MdEdit size={16} />
                        </Link>
                        <button
                          type="button"
                          onClick={() => trashPost(post.id)}
                          disabled={isPending(`dashboard.posts.delete:${post.id}`)}
                          aria-busy={isPending(`dashboard.posts.delete:${post.id}`) || undefined}
                          className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-red-50 text-gray-500 hover:text-[#b91c1c] transition-colors"
                          title="Move to trash"
                        >
                          {isPending(`dashboard.posts.delete:${post.id}`) ? (
                            <InlineSpinner size="xs" className="text-[#b91c1c]" />
                          ) : (
                            <MdDeleteOutline size={16} />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="mt-10 flex flex-col items-center justify-center gap-4 rounded-[24px] border border-dashed border-[#d8dde6] bg-[#fafbff] px-6 py-16 text-center">
            <div className="max-w-sm">
              <h2 className="text-[1.1rem] font-medium text-[#0f1116]">No posts found</h2>
              <p className="mt-1 text-[0.85rem] text-gray-500">
                {search
                  ? `No posts match "${search}". Try a different search.`
                  : 'No posts in this status category.'}
              </p>
            </div>
            {!search && (
              <Link
                href="/dashboard/content/new?type=post"
                className="mt-1 inline-flex items-center gap-2 rounded-xl bg-[#d5ea52] px-5 py-2.5 text-[0.85rem] font-medium text-[#0f1116] shadow-sm hover:opacity-90 transition-opacity"
              >
                <MdAdd size={18} />
                Create New Post
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
