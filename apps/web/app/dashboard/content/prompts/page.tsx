'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import {
  MdSearch,
  MdEdit,
  MdDeleteOutline,
  MdVisibility,
  MdMoreVert,
  MdAdd,
  MdFilterList,
} from 'react-icons/md';
import { useAdminApi } from '../../../components/dashboard/use-admin-api';
import { formatRelativeTimeOrDash } from '../../../../lib/utils/format';

type ApiPromptStatus = 'DRAFT' | 'SCHEDULED' | 'PUBLISHED' | 'ARCHIVED';
type ApiVisibility = 'FREE' | 'EXCLUSIVE';

type Prompt = {
  id: string;
  title: string;
  slug: string;
  image: string | null;
  categoryId: string | null;
  categoryName: string;
  status: ApiPromptStatus;
  visibility: ApiVisibility;
  updatedAt: string;
  updatedAtISO: string;
  views: number;
};

type PromptResponse = {
  items: Array<{
    id: string;
    title: string;
    slug: string;
    status: ApiPromptStatus;
    visibility: ApiVisibility;
    updatedAt: string;
    createdAt: string;
    viewCount?: number | null;
    featuredImageUrl?: string | null;
    primaryCategory?: { id: string; name: string; slug: string } | null;
    categories?: Array<{ id: string; name: string; slug: string }>;
  }>;
  total: number;
};

type CategoryOption = { id: string; name: string; slug: string };

const STATUS_TABS = ['All', 'Published', 'Draft', 'Scheduled'] as const;
type StatusTab = (typeof STATUS_TABS)[number];

function statusColors(statusLabel: string) {
  if (statusLabel === 'Published') return 'bg-green-50 text-green-600';
  if (statusLabel === 'Private') return 'bg-purple-50 text-purple-600';
  if (statusLabel === 'Draft') return 'bg-gray-100 text-gray-600';
  if (statusLabel === 'Scheduled') return 'bg-blue-50 text-blue-600';
  return 'bg-gray-100 text-gray-600';
}

function getStatusLabel(status: ApiPromptStatus, visibility: ApiVisibility) {
  if (status === 'PUBLISHED' && visibility === 'EXCLUSIVE') return 'Private';
  if (status === 'PUBLISHED') return 'Published';
  if (status === 'SCHEDULED') return 'Scheduled';
  if (status === 'ARCHIVED') return 'Archived';
  return 'Draft';
}

function ManageMenu({
  promptId,
  promptSlug,
  onTrash,
  onClose,
}: {
  promptId: string;
  promptSlug?: string | null;
  onTrash: () => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute right-0 top-[calc(100%+6px)] z-30 w-40 rounded-[14px] border border-[#e2e6ee] bg-white p-1.5 shadow-xl"
    >
      <Link
        href={`/dashboard/content/new?edit=${promptId}&type=prompt`}
        className="flex items-center gap-2.5 rounded-[10px] px-3 py-2 text-[0.82rem] text-[#0f1116] hover:bg-gray-50 transition-colors"
        onClick={onClose}
      >
        <MdEdit size={15} className="text-gray-500" />
        Edit
      </Link>
      <Link
        href={promptSlug ? `/prompt/${promptSlug}` : '#'}
        target="_blank"
        className="flex items-center gap-2.5 rounded-[10px] px-3 py-2 text-[0.82rem] text-[#0f1116] hover:bg-gray-50 transition-colors"
        onClick={onClose}
      >
        <MdVisibility size={15} className="text-gray-500" />
        View live
      </Link>
      <hr className="my-1 border-[#f0f2f6]" />
      <button
        type="button"
        onClick={() => { onTrash(); onClose(); }}
        className="flex w-full items-center gap-2.5 rounded-[10px] px-3 py-2 text-[0.82rem] text-[#b94a4a] hover:bg-red-50 transition-colors"
      >
        <MdDeleteOutline size={15} />
        Move to trash
      </button>
    </div>
  );
}

export default function PromptsManagementPage() {
  const { request, status: authStatus } = useAdminApi();
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<StatusTab>('All');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [sortFilter, setSortFilter] = useState<'recent' | 'views' | 'az'>('recent');
  const requestIdRef = useRef(0);

  // Bulk Action States
  const [activeBulkAction, setActiveBulkAction] = useState<'category' | 'tags' | 'status' | null>(null);
  const [bulkMenuOpen, setBulkMenuOpen] = useState(false);

  useEffect(() => {
    if (authStatus !== 'authenticated') return;
    let isActive = true;
    request<{ items: CategoryOption[] }>('/api/admin/categories?take=200')
      .then((payload) => {
        if (!isActive) return;
        setCategories(payload.items ?? []);
      })
      .catch(() => {});
    return () => {
      isActive = false;
    };
  }, [authStatus, request]);

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
          activeTab === 'Published'
            ? 'PUBLISHED'
            : activeTab === 'Draft'
              ? 'DRAFT'
              : 'SCHEDULED';
        params.set('status', mappedStatus);
      }
      if (categoryFilter !== 'All') {
        params.set('categoryId', categoryFilter);
      }
      params.set('sort', sortFilter);

      request<PromptResponse>(`/api/admin/prompts?${params.toString()}`, {
        signal: controller.signal,
      })
        .then((payload) => {
          if (requestIdRef.current !== requestId) return;
          const items = payload.items ?? [];
          const mapped = items.map((item) => {
            const primary = item.primaryCategory ?? item.categories?.[0] ?? null;
            const updatedAtValue = item.updatedAt || item.createdAt;
            return {
              id: item.id,
              slug: item.slug,
              title: item.title,
              image: item.featuredImageUrl ?? null,
              categoryId: primary?.id ?? null,
              categoryName: primary?.name ?? 'Uncategorized',
              status: item.status,
              visibility: item.visibility,
              updatedAt: formatRelativeTimeOrDash(updatedAtValue),
              updatedAtISO: updatedAtValue,
              views: item.viewCount ?? 0,
            } satisfies Prompt;
          });
          setPrompts(mapped);
          setTotal(payload.total ?? mapped.length);
        })
        .catch((err: Error) => {
          if (requestIdRef.current !== requestId) return;
          if (err?.name === 'AbortError') return;
          setLoadError(err.message || 'Unable to load prompts.');
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
  }, [activeTab, authStatus, categoryFilter, request, search, sortFilter]);

  const trashPrompt = async (id: string) => {
    try {
      await request(`/api/admin/prompts/${id}`, { method: 'DELETE' });
      setPrompts((prev) => prev.filter((p) => p.id !== id));
      setSelectedIds((prev) => prev.filter((item) => item !== id));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to delete prompt.';
      setLoadError(message);
    }
  };

  const filtered = prompts.filter((p) => {
    const matchesTab =
      activeTab === 'All' ||
      (activeTab === 'Published' && p.status === 'PUBLISHED') ||
      (activeTab === 'Draft' && p.status === 'DRAFT') ||
      (activeTab === 'Scheduled' && p.status === 'SCHEDULED');
    const matchesCategory = categoryFilter === 'All' || p.categoryId === categoryFilter;
    const lowerSearch = search.toLowerCase();
    const matchesSearch = p.title.toLowerCase().includes(lowerSearch) ||
      p.categoryName.toLowerCase().includes(lowerSearch);
    return matchesTab && matchesSearch && matchesCategory;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sortFilter === 'az') return a.title.localeCompare(b.title);
    if (sortFilter === 'views') return b.views - a.views;
    return new Date(b.updatedAtISO).getTime() - new Date(a.updatedAtISO).getTime();
  });

  const allSelected = filtered.length > 0 && selectedIds.length === filtered.length;

  const toggleSelectAll = () => {
    setSelectedIds(allSelected ? [] : filtered.map((item) => item.id));
  };

  const toggleSelection = (id: string) => {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    );
  };

  const handleBulkStatusChange = async (nextStatus: 'Published' | 'Draft' | 'Scheduled') => {
    const mappedStatus =
      nextStatus === 'Published'
        ? 'PUBLISHED'
        : nextStatus === 'Draft'
          ? 'DRAFT'
          : 'SCHEDULED';
    try {
      await Promise.all(
        selectedIds.map((id) =>
          request(`/api/admin/prompts/${id}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status: mappedStatus }),
          }),
        ),
      );
      setPrompts((prev) =>
        prev.map((p) => (selectedIds.includes(p.id) ? { ...p, status: mappedStatus } : p)),
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to update status.';
      setLoadError(message);
    } finally {
      setSelectedIds([]);
      setBulkMenuOpen(false);
      setActiveBulkAction(null);
      setIsSelectMode(false);
    }
  };

  const handleBulkCategoryChange = async (categoryId: string) => {
    const category = categories.find((item) => item.id === categoryId);
    if (!category) return;
    try {
      await Promise.all(
        selectedIds.map((id) =>
          request(`/api/admin/prompts/${id}`, {
            method: 'PATCH',
            body: JSON.stringify({
              primaryCategoryId: categoryId,
              categoryIds: [categoryId],
            }),
          }),
        ),
      );
      setPrompts((prev) =>
        prev.map((p) =>
          selectedIds.includes(p.id)
            ? { ...p, categoryId: categoryId, categoryName: category.name }
            : p,
        ),
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to update category.';
      setLoadError(message);
    } finally {
      setSelectedIds([]);
      setBulkMenuOpen(false);
      setActiveBulkAction(null);
      setIsSelectMode(false);
    }
  };

  const handleBulkDelete = async () => {
    try {
      await Promise.all(
        selectedIds.map((id) => request(`/api/admin/prompts/${id}`, { method: 'DELETE' })),
      );
      setPrompts((prev) => prev.filter((p) => !selectedIds.includes(p.id)));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to delete selected prompts.';
      setLoadError(message);
    } finally {
      setSelectedIds([]);
      setIsSelectMode(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[1.8rem] font-medium tracking-tight text-[#0f1116]">Prompt Management</h1>
          <p className="text-[0.95rem] text-gray-500">Manage, edit, and monitor your AI prompts.</p>
        </div>
        <div className="relative flex flex-wrap gap-2 sm:gap-3">
          {isSelectMode ? (
            <button
              type="button"
              onClick={() => { setIsSelectMode(false); setSelectedIds([]); }}
              className="inline-flex items-center gap-2 rounded-xl border border-[#e1e5ee] bg-white px-4 py-2 text-[0.85rem] font-medium text-[#0f1116] shadow-sm hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIsSelectMode(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-[#e1e5ee] bg-white px-4 py-2 text-[0.85rem] font-medium text-[#0f1116] shadow-sm hover:bg-gray-50 transition-colors"
            >
              Select
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsFilterOpen((prev) => !prev)}
            className="inline-flex items-center gap-2 rounded-xl border border-[#e1e5ee] bg-white px-3 py-2 text-[0.85rem] font-medium text-[#0f1116] shadow-sm hover:bg-gray-50 transition-colors"
          >
            <MdFilterList size={18} />
            Filters
          </button>
          {isFilterOpen ? (
            <div className="absolute right-0 top-[calc(100%+8px)] z-30 w-[260px] rounded-[16px] border border-[#e2e6ee] bg-white p-4 shadow-xl">
              <div className="space-y-3">
                <div>
                  <p className="text-[0.75rem] font-medium uppercase tracking-wide text-gray-400">Category</p>
                  <select
                    value={categoryFilter}
                    onChange={(event) => setCategoryFilter(event.target.value)}
                    className="mt-2 w-full rounded-[12px] border border-[#e1e5ee] bg-white px-3 py-2 text-[0.85rem] text-gray-700"
                  >
                    <option value="All">All categories</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <p className="text-[0.75rem] font-medium uppercase tracking-wide text-gray-400">Sort by</p>
                  <select
                    value={sortFilter}
                    onChange={(event) => setSortFilter(event.target.value as 'recent' | 'views' | 'az')}
                    className="mt-2 w-full rounded-[12px] border border-[#e1e5ee] bg-white px-3 py-2 text-[0.85rem] text-gray-700"
                  >
                    <option value="recent">Recently uploaded</option>
                    <option value="views">Most viewed</option>
                    <option value="az">A-Z</option>
                  </select>
                </div>
                <div>
                  <p className="text-[0.75rem] font-medium uppercase tracking-wide text-gray-400">Status</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {STATUS_TABS.map((tab) => (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => setActiveTab(tab)}
                        className={`rounded-full px-3 py-1.5 text-[0.75rem] transition-colors ${
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
                <button
                  type="button"
                  onClick={() => {
                    setCategoryFilter('All');
                    setActiveTab('All');
                    setSortFilter('recent');
                  }}
                  className="w-full rounded-[12px] border border-[#e1e5ee] px-3 py-2 text-[0.8rem] text-gray-600 hover:bg-gray-50"
                >
                  Reset filters
                </button>
              </div>
            </div>
          ) : null}
          <Link
            href="/dashboard/content/new?type=prompt"
            className="inline-flex items-center gap-2 rounded-xl bg-[#d5ea52] px-4 py-2 text-[0.85rem] font-medium text-[#0f1116] shadow-sm hover:opacity-90 transition-opacity"
          >
            <MdAdd size={18} />
            New Prompt
          </Link>
        </div>
      </div>

      {loadError && (
        <div className="rounded-[14px] border border-red-100 bg-red-50 px-4 py-3 text-[0.85rem] text-red-700">
          {loadError}
        </div>
      )}

      {/* Toolbar */}
      <div className="rounded-[24px] border border-[#e2e6ee] bg-white p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Search */}
          <div className="relative w-full sm:max-w-xs">
            <MdSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search prompts…"
              className="w-full rounded-[999px] border border-[#e1e5ee] bg-white py-2.5 pl-9 pr-3 text-[0.85rem] text-[#0f1116] placeholder:text-gray-400 focus:border-[#0f1116] focus:outline-none focus:ring-1 focus:ring-[#0f1116]/10"
            />
          </div>

          <div />
        </div>

        {/* Count + bulk actions (only in select mode) */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-[0.8rem] text-gray-400">
          <p>{isLoading ? 'Loading prompts…' : `Showing ${sorted.length} of ${total} prompts`}</p>
          {isSelectMode && (
            <div className="flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-2 text-[0.8rem] text-gray-500">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleSelectAll}
                  className="h-4 w-4 rounded border-[#d7dbe5]"
                />
                Select all
              </label>
              <span className="text-[0.8rem] text-gray-400">{selectedIds.length} selected</span>
              <div className="relative">
                <button
                  type="button"
                  disabled={selectedIds.length === 0}
                  onClick={() => {
                    setBulkMenuOpen(!bulkMenuOpen);
                    setActiveBulkAction('category');
                  }}
                  className="rounded-full border border-[#e1e5ee] px-3 py-1.5 text-[0.78rem] text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Edit Category
                </button>
                {bulkMenuOpen && activeBulkAction === 'category' && (
                  <div className="absolute left-0 mt-2 z-30 w-48 rounded-[12px] border border-[#e2e6ee] bg-white p-1.5 shadow-xl">
                    {categories.map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => handleBulkCategoryChange(cat.id)}
                        className="block w-full rounded-md px-3 py-1.5 text-left text-[0.82rem] hover:bg-gray-50"
                      >
                        {cat.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button
                type="button"
                disabled={selectedIds.length === 0}
                className="rounded-full border border-[#e1e5ee] px-3 py-1.5 text-[0.78rem] text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 opacity-40 cursor-not-allowed"
                title="Not impemented yet"
              >
                Edit Tags
              </button>
              <div className="relative">
                <button
                  type="button"
                  disabled={selectedIds.length === 0}
                  onClick={() => {
                    setBulkMenuOpen(!bulkMenuOpen);
                    setActiveBulkAction('status');
                  }}
                  className="rounded-full border border-[#e1e5ee] px-3 py-1.5 text-[0.78rem] text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Edit Status
                </button>
                {bulkMenuOpen && activeBulkAction === 'status' && (
                  <div className="absolute left-0 mt-2 z-30 w-40 rounded-[12px] border border-[#e2e6ee] bg-white p-1.5 shadow-xl">
                    {STATUS_TABS.filter(t => t !== 'All').map((status) => (
                      <button
                        key={status}
                        type="button"
                        onClick={() => handleBulkStatusChange(status as 'Published' | 'Draft' | 'Scheduled')}
                        className="block w-full rounded-md px-3 py-1.5 text-left text-[0.82rem] hover:bg-gray-50"
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {selectedIds.length > 0 && (
                <button
                  type="button"
                  onClick={handleBulkDelete}
                  className="rounded-full bg-red-50 border border-red-100 px-3 py-1.5 text-[0.78rem] text-red-600 hover:bg-red-100 transition-colors"
                >
                  Delete Selected
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Grid */}
      {sorted.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {sorted.map((prompt) => (
            <div key={prompt.id} className="overflow-visible rounded-[24px] border border-[#e2e6ee] bg-white shadow-sm flex flex-col">
              <div className="px-4 pt-4">
                <div
                  className="h-[160px] w-full rounded-[20px] bg-cover bg-center"
                  style={{ backgroundImage: `url(${prompt.image ?? ''})` }}
                />
              </div>
              <div className="flex flex-1 flex-col gap-3 p-5">
                <div className="flex items-center justify-between gap-3">
                  <span className="rounded-full bg-[#0f1116]/5 px-2.5 py-1 text-[0.7rem] text-[#0f1116]">
                    {prompt.categoryName}
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-1 text-[0.7rem] font-medium ${statusColors(
                      getStatusLabel(prompt.status, prompt.visibility),
                    )}`}
                  >
                    {getStatusLabel(prompt.status, prompt.visibility)}
                  </span>
                </div>
                <h3 className="text-[1rem] font-medium text-[#0f1116] leading-snug">{prompt.title}</h3>

                <div className="mt-auto flex items-center justify-between border-t border-[#eef2f6] pt-3 text-[0.8rem] text-gray-500">
                  <label className="flex items-center gap-2">
                    {isSelectMode && (
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(prompt.id)}
                        onChange={() => toggleSelection(prompt.id)}
                        className="h-4 w-4 rounded border-[#d7dbe5]"
                      />
                    )}
                    Edited {prompt.updatedAt}
                  </label>

                  {/* Manage dropdown */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setOpenMenuId((prev) => (prev === prompt.id ? null : prompt.id))}
                      className="flex items-center gap-1 rounded-full px-2.5 py-1 text-[#1e4fd2] hover:bg-blue-50 transition-colors"
                    >
                      Manage
                      <MdMoreVert size={15} />
                    </button>
                    {openMenuId === prompt.id && (
                      <ManageMenu
                        promptId={prompt.id}
                        promptSlug={prompt.slug}
                        onTrash={() => trashPrompt(prompt.id)}
                        onClose={() => setOpenMenuId(null)}
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-4 rounded-[24px] border border-dashed border-[#d8dde6] bg-[#fafbff] px-6 py-16 text-center">
          <p className="text-[0.95rem] text-gray-500">
            {search ? `No prompts match "${search}"` : 'No prompts in this status.'}
          </p>
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="text-[0.85rem] text-[#1e4fd2] hover:underline"
            >
              Clear search
            </button>
          )}
        </div>
      )}
    </div>
  );
}
