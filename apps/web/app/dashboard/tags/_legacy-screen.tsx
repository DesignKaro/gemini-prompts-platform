'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  MdSearch,
  MdAdd,
  MdLabel,
  MdEdit,
  MdDeleteOutline,
  MdClose,
  MdCheck,
} from 'react-icons/md';
import { useAdminApi } from '../../components/dashboard/use-admin-api';
import { ActionError } from '../../components/dashboard/action-error';
import { bulkActionMessage, runBulkAction } from '../../components/dashboard/bulk-action';
import { InlineSpinner } from '../../components/ui/inline-spinner';
import { LoadingButton } from '../../components/ui/loading-button';

type Tag = {
  id: string;
  name: string;
  usage: number;
  color: string;
};

const PRESET_COLORS = [
  '#d5ea52',
  '#60a5fa',
  '#a855f7',
  '#f97316',
  '#10b981',
  '#f43f5e',
  '#eab308',
  '#6366f1',
];

type TagResponse = {
  items: Array<{
    id: string;
    name: string;
    slug: string;
    usage?: number;
    color?: string | null;
  }>;
  total: number;
};

const TAG_PENDING_KEY = {
  create: 'dashboard.tags.create',
  update: (id: string) => `dashboard.tags.update:${id}`,
  delete: (id: string) => `dashboard.tags.delete:${id}`,
  bulkDelete: 'dashboard.tags.bulk.delete',
};

function TagModal({
  editTag,
  onSave,
  onClose,
  pending,
}: {
  editTag: Tag | null;
  onSave: (name: string, color: string) => void;
  onClose: () => void;
  pending: boolean;
}) {
  const [name, setName] = useState(editTag?.name ?? '');
  const [color, setColor] = useState(editTag?.color ?? PRESET_COLORS[0]!);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pending) return;
    if (!name.trim()) {
      setError('Tag name is required.');
      return;
    }
    const normalizedName = name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');

    if (!normalizedName) {
      setError('Tag name must include at least one letter or number.');
      return;
    }

    onSave(normalizedName, color);
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-[440px] rounded-[28px] bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-[1.15rem] font-medium text-[#0f1116]">
              {editTag ? 'Edit Tag' : 'New Tag'}
            </h2>
            <p className="text-[0.82rem] text-gray-500 mt-0.5">
              {editTag ? 'Update the tag details below.' : 'Fill in details for the new tag.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors"
          >
            <MdClose size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-5">
          <label className="block space-y-2 text-[0.85rem] text-gray-600">
            Tag name
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError('');
              }}
              placeholder="e.g. prompt-engineering"
              className={`mt-1 w-full rounded-[12px] border px-3.5 py-2.5 text-[0.9rem] text-[#0f1116] outline-none transition-colors focus:border-[#0f1116] focus:ring-1 focus:ring-[#0f1116]/10 ${error ? 'border-red-300 bg-red-50' : 'border-[#e1e5ee]'}`}
            />
            {error && <p className="text-[0.78rem] text-red-600 mt-1">{error}</p>}
          </label>

          <div className="space-y-2 text-[0.85rem] text-gray-600">
            Tag colour
            <div className="mt-1 flex flex-wrap gap-2.5">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className="flex h-8 w-8 items-center justify-center rounded-full transition-transform hover:scale-110"
                  style={{ backgroundColor: c }}
                  title={c}
                >
                  {color === c && <MdCheck size={16} className="text-[#0f1116]/70" />}
                </button>
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className="rounded-[14px] bg-[#f7f9fc] px-4 py-3 flex items-center gap-3">
            <span
              className="flex h-7 w-7 items-center justify-center rounded-full text-white shrink-0"
              style={{ backgroundColor: color }}
            >
              <MdLabel size={15} />
            </span>
            <p className="text-[0.88rem] font-medium text-[#0f1116]">#{name || 'preview-tag'}</p>
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={pending}
              className="flex-1 rounded-xl border border-[#e1e5ee] py-2 text-[0.85rem] text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <LoadingButton
              type="submit"
              pending={pending}
              pendingLabel={editTag ? 'Saving...' : 'Creating...'}
              spinnerSize="xs"
              spinnerClassName="text-white"
              className="flex-1 rounded-xl bg-[#0f1116] py-2 text-[0.85rem] font-medium text-white hover:opacity-90 transition-opacity"
            >
              {editTag ? 'Save Changes' : 'Create Tag'}
            </LoadingButton>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}

export default function TagsPage() {
  const { request, status: authStatus, isPending } = useAdminApi();
  const [tags, setTags] = useState<Tag[]>([]);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (authStatus !== 'authenticated') return;
    let isActive = true;
    setIsLoading(true);
    setLoadError(null);
    request<TagResponse>('/api/admin/tags?take=200', { actionName: 'dashboard.tags.list' })
      .then((payload) => {
        if (!isActive) return;
        const mapped = (payload.items ?? []).map((item) => ({
          id: item.id,
          name: item.name,
          usage: item.usage ?? 0,
          color: item.color ?? PRESET_COLORS[0]!,
        }));
        setTags(mapped);
      })
      .catch((err: Error) => {
        if (!isActive) return;
        setLoadError(err.message || 'Unable to load tags.');
      })
      .finally(() => {
        if (!isActive) return;
        setIsLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [authStatus, request]);

  const filtered = tags.filter((t) => t.name.toLowerCase().includes(search.toLowerCase()));

  const openCreate = () => {
    setEditingTag(null);
    setIsModalOpen(true);
  };
  const openEdit = (tag: Tag) => {
    setEditingTag(tag);
    setIsModalOpen(true);
  };

  const handleSave = async (name: string, color: string) => {
    setLoadError(null);
    try {
      const payload = {
        name,
        slug: name,
        color,
      };
      if (editingTag) {
        const pendingKey = TAG_PENDING_KEY.update(editingTag.id);
        if (isPending(pendingKey)) return;
        await request(`/api/admin/tags/${editingTag.id}`, {
          method: 'PATCH',
          actionName: 'dashboard.tags.update',
          pendingKey,
          body: JSON.stringify(payload),
        });
      } else {
        if (isPending(TAG_PENDING_KEY.create)) return;
        await request('/api/admin/tags', {
          method: 'POST',
          actionName: 'dashboard.tags.create',
          pendingKey: TAG_PENDING_KEY.create,
          body: JSON.stringify(payload),
        });
      }
      const refreshed = await request<TagResponse>('/api/admin/tags?take=200', {
        actionName: 'dashboard.tags.list',
      });
      const mapped = (refreshed.items ?? []).map((item) => ({
        id: item.id,
        name: item.name,
        usage: item.usage ?? 0,
        color: item.color ?? PRESET_COLORS[0]!,
      }));
      setTags(mapped);
      setIsModalOpen(false);
      setEditingTag(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to save tag.';
      setLoadError(message);
    }
  };

  const handleDelete = async (id: string) => {
    const pendingKey = TAG_PENDING_KEY.delete(id);
    if (isPending(pendingKey)) return;
    setLoadError(null);
    try {
      await request(`/api/admin/tags/${id}`, {
        method: 'DELETE',
        actionName: 'dashboard.tags.delete',
        pendingKey,
      });
      setTags((prev) => prev.filter((t) => t.id !== id));
      setSelectedIds((prev) => prev.filter((sid) => sid !== id));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to delete tag.';
      setLoadError(message);
    } finally {
      setDeleteConfirmId(null);
    }
  };

  const handleBulkDelete = async () => {
    if (isPending(TAG_PENDING_KEY.bulkDelete)) return;
    try {
      const result = await runBulkAction({
        ids: selectedIds,
        actionLabel: 'Delete',
        run: (id) =>
          request(`/api/admin/tags/${id}`, {
            method: 'DELETE',
            actionName: 'dashboard.tags.delete',
            pendingKey: TAG_PENDING_KEY.bulkDelete,
          }).then(() => undefined),
      });

      const failedIds = new Set(result.failures.map((entry) => entry.id));
      setTags((prev) => prev.filter((tag) => !selectedIds.includes(tag.id) || failedIds.has(tag.id)));
      setSelectedIds(Array.from(failedIds));
      setLoadError(bulkActionMessage(result, 'Delete'));

      if (result.failureCount === 0) {
        setIsSelectMode(false);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to delete selected tags.';
      setLoadError(message);
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filtered.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filtered.map((t) => t.id));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[1.8rem] font-medium tracking-tight text-[#0f1116]">Tags</h1>
          <p className="text-[0.95rem] text-gray-500">
            Organize your prompts and posts with reusable tags.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 sm:gap-3">
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
              {selectedIds.length > 0 && (
                <LoadingButton
                  type="button"
                  onClick={handleBulkDelete}
                  pending={isPending(TAG_PENDING_KEY.bulkDelete)}
                  pendingLabel={`Deleting selected (${selectedIds.length})...`}
                  spinnerSize="xs"
                  className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-[0.85rem] font-medium text-red-600 shadow-sm hover:bg-red-100 transition-colors"
                >
                  Delete Selected ({selectedIds.length})
                </LoadingButton>
              )}
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
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-xl bg-[#d5ea52] px-4 py-2 text-[0.85rem] font-medium text-[#0f1116] shadow-sm hover:opacity-90 transition-opacity"
          >
            <MdAdd size={18} />
            New Tag
          </button>
        </div>
      </div>

      {loadError && <ActionError error={loadError} />}

      {isSelectMode && filtered.length > 0 && (
        <label className="flex w-fit items-center gap-2 text-[0.85rem] font-medium text-gray-600 mb-2 cursor-pointer">
          <input
            type="checkbox"
            checked={filtered.length > 0 && selectedIds.length === filtered.length}
            onChange={toggleSelectAll}
            className="h-4 w-4 rounded border-[#d7dbe5] accent-[#0f1116]"
          />
          Select All Tags
        </label>
      )}

      <div className="rounded-[24px] border border-[#e2e6ee] bg-white p-4 sm:p-5">
        {/* Search */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-xs">
            <MdSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tags…"
              className="w-full rounded-[999px] border border-[#e1e5ee] bg-white py-2.5 pl-9 pr-3 text-[0.85rem] text-[#0f1116] placeholder:text-gray-400 focus:border-[#0f1116] focus:outline-none focus:ring-1 focus:ring-[#0f1116]/10"
            />
          </div>
          <p className="text-[0.8rem] text-gray-500">
            {filtered.length} tag{filtered.length !== 1 ? 's' : ''} found
          </p>
        </div>

        {/* Tags list */}
        {filtered.length > 0 ? (
          <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((tag) => (
              <div
                key={tag.id}
                className={`flex items-center justify-between rounded-[20px] border transition-colors bg-[#fbfcff] px-4 py-3 ${selectedIds.includes(tag.id) ? 'border-[#0f1116] bg-gray-50' : 'border-[#eef1f6]'}`}
              >
                <div className="flex items-center gap-3">
                  {isSelectMode && (
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(tag.id)}
                      onChange={() => toggleSelection(tag.id)}
                      className="h-4 w-4 rounded border-[#d7dbe5] accent-[#0f1116] cursor-pointer"
                    />
                  )}
                  <span
                    className="flex h-7 w-7 items-center justify-center rounded-full shrink-0"
                    style={{ backgroundColor: tag.color }}
                  >
                    <MdLabel size={16} className="text-white" />
                  </span>
                  <div>
                    <p className="text-[0.9rem] font-medium text-[#0f1116]">#{tag.name}</p>
                    <p className="text-[0.8rem] text-gray-500">
                      Used in {tag.usage.toLocaleString()} items
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-gray-400">
                  <button
                    type="button"
                    onClick={() => openEdit(tag)}
                    disabled={isPending(TAG_PENDING_KEY.delete(tag.id))}
                    className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-gray-100 hover:text-[#0f1116] transition-colors"
                    title="Edit tag"
                  >
                    <MdEdit size={15} />
                  </button>

                  {deleteConfirmId === tag.id ? (
                    <div className="flex items-center gap-1">
                      <LoadingButton
                        type="button"
                        onClick={() => handleDelete(tag.id)}
                        pending={isPending(TAG_PENDING_KEY.delete(tag.id))}
                        pendingLabel="Deleting..."
                        spinnerSize="xs"
                        className="rounded-full bg-red-50 px-2 py-1 text-[0.72rem] font-medium text-red-700 hover:bg-red-100 transition-colors"
                      >
                        Confirm
                      </LoadingButton>
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmId(null)}
                        disabled={isPending(TAG_PENDING_KEY.delete(tag.id))}
                        className="rounded-full bg-gray-50 px-2 py-1 text-[0.72rem] text-gray-500 hover:bg-gray-100 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setDeleteConfirmId(tag.id)}
                      disabled={isPending(TAG_PENDING_KEY.delete(tag.id))}
                      aria-busy={isPending(TAG_PENDING_KEY.delete(tag.id)) || undefined}
                      className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-red-50 hover:text-[#b91c1c] transition-colors"
                      title="Delete tag"
                    >
                      {isPending(TAG_PENDING_KEY.delete(tag.id)) ? (
                        <InlineSpinner size="xs" className="text-[#b91c1c]" />
                      ) : (
                        <MdDeleteOutline size={15} />
                      )}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-10 flex flex-col items-center justify-center gap-4 rounded-[24px] border border-dashed border-[#d8dde6] bg-[#fafbff] px-6 py-16 text-center">
            <div className="h-16 w-16 rounded-full bg-white shadow-sm flex items-center justify-center text-gray-400">
              <MdLabel size={26} />
            </div>
            <div className="max-w-sm">
              <h2 className="text-[1.1rem] font-medium text-[#0f1116]">
                {isLoading
                  ? 'Loading tags…'
                  : search
                    ? `No tags match "${search}"`
                    : 'No tags created yet'}
              </h2>
              <p className="mt-1 text-[0.85rem] text-gray-500">
                {search
                  ? 'Try a different keyword.'
                  : 'Start by adding a few tags to group related prompts and posts.'}
              </p>
            </div>
            {!search && (
              <button
                type="button"
                onClick={openCreate}
                className="mt-1 inline-flex items-center gap-2 rounded-xl bg-[#d5ea52] px-5 py-2.5 text-[0.85rem] font-medium text-[#0f1116] shadow-sm hover:opacity-90 transition-opacity"
              >
                <MdAdd size={18} />
                Create First Tag
              </button>
            )}
          </div>
        )}
      </div>

      {isModalOpen && (
        <TagModal
          editTag={editingTag}
          onSave={handleSave}
          onClose={() => setIsModalOpen(false)}
          pending={
            editingTag
              ? isPending(TAG_PENDING_KEY.update(editingTag.id))
              : isPending(TAG_PENDING_KEY.create)
          }
        />
      )}
    </div>
  );
}
