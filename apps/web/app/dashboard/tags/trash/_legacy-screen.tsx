'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { MdRestoreFromTrash, MdDeleteOutline, MdLabel } from 'react-icons/md';
import { useAdminApi } from '../../../components/dashboard/use-admin-api';
import { ActionError } from '../../../components/dashboard/action-error';
import { bulkActionMessage, runBulkAction } from '../../../components/dashboard/bulk-action';
import { formatRelativeTimeOrDash } from '../../../../lib/utils/format';

type TrashedTag = {
  id: string;
  name: string;
  color: string;
  deletedAt: string;
  deletedAtISO: string;
};

type TagResponse = {
  items: Array<{
    id: string;
    name: string;
    color?: string | null;
    deletedAt?: string | null;
    updatedAt?: string;
    createdAt?: string;
  }>;
  total: number;
};

export default function TagsTrashPage() {
  const { request, status: authStatus } = useAdminApi();
  const [items, setItems] = useState<TrashedTag[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (authStatus !== 'authenticated') return;
    let isActive = true;
    setIsLoading(true);
    setLoadError(null);
    request<TagResponse>('/api/admin/tags?take=200&trash=true', {
      actionName: 'dashboard.tags.trash.list',
    })
      .then((payload) => {
        if (!isActive) return;
        const mapped = (payload.items ?? []).map((item) => {
          const deletedAtValue = item.deletedAt || item.updatedAt || item.createdAt || '';
          return {
            id: item.id,
            name: item.name,
            color: item.color ?? '#cbd5f5',
            deletedAt: formatRelativeTimeOrDash(deletedAtValue),
            deletedAtISO: deletedAtValue,
          };
        });
        setItems(mapped);
      })
      .catch((err: Error) => {
        if (!isActive) return;
        setLoadError(err.message || 'Unable to load trashed tags.');
      })
      .finally(() => {
        if (!isActive) return;
        setIsLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [authStatus, request]);

  const toggle = (id: string) => {
    setSelected((p) => {
      const n = new Set(p);
      if (n.has(id)) {
        n.delete(id);
      } else {
        n.add(id);
      }
      return n;
    });
  };
  const allSelected = items.length > 0 && selected.size === items.length;
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(items.map((i) => i.id)));

  const restore = async (id: string) => {
    try {
      await request(`/api/admin/tags/${id}/restore`, {
        method: 'PATCH',
        actionName: 'dashboard.tags.restore',
      });
      setItems((p) => p.filter((i) => i.id !== id));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to restore tag.';
      setLoadError(message);
    } finally {
      setSelected((p) => {
        const n = new Set(p);
        n.delete(id);
        return n;
      });
    }
  };
  const deletePerm = async (id: string) => {
    try {
      await request(`/api/admin/tags/${id}`, {
        method: 'DELETE',
        actionName: 'dashboard.tags.delete-permanent',
      });
      setItems((p) => p.filter((i) => i.id !== id));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to delete tag.';
      setLoadError(message);
    } finally {
      setSelected((p) => {
        const n = new Set(p);
        n.delete(id);
        return n;
      });
      setConfirmId(null);
    }
  };
  const restoreSelected = async () => {
    try {
      const selectedIds = Array.from(selected);
      const result = await runBulkAction({
        ids: selectedIds,
        actionLabel: 'Restore',
        run: (id) =>
          request(`/api/admin/tags/${id}/restore`, {
            method: 'PATCH',
            actionName: 'dashboard.tags.restore',
          }).then(() => undefined),
      });
      const failedIds = new Set(result.failures.map((entry) => entry.id));
      setItems((p) => p.filter((item) => !selectedIds.includes(item.id) || failedIds.has(item.id)));
      setSelected(failedIds);
      setLoadError(bulkActionMessage(result, 'Restore'));
      if (result.failureCount === 0) {
        setIsSelectMode(false);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to restore selected tags.';
      setLoadError(message);
    }
  };
  const deleteSelected = async () => {
    try {
      const selectedIds = Array.from(selected);
      const result = await runBulkAction({
        ids: selectedIds,
        actionLabel: 'Delete',
        run: (id) =>
          request(`/api/admin/tags/${id}`, {
            method: 'DELETE',
            actionName: 'dashboard.tags.delete-permanent',
          }).then(() => undefined),
      });
      const failedIds = new Set(result.failures.map((entry) => entry.id));
      setItems((p) => p.filter((item) => !selectedIds.includes(item.id) || failedIds.has(item.id)));
      setSelected(failedIds);
      setLoadError(bulkActionMessage(result, 'Delete'));
      if (result.failureCount === 0) {
        setIsSelectMode(false);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to delete selected tags.';
      setLoadError(message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[1.8rem] font-medium tracking-tight text-[#0f1116]">Tag Trash</h1>
          <p className="text-[0.95rem] text-gray-500">
            Recover or permanently delete trashed tags.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isSelectMode ? (
            <button
              type="button"
              onClick={() => {
                setIsSelectMode(false);
                setSelected(new Set());
              }}
              className="inline-flex items-center gap-2 rounded-xl border border-[#e1e5ee] bg-white px-4 py-2 text-[0.85rem] font-medium text-[#0f1116] hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIsSelectMode(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-[#e1e5ee] bg-white px-4 py-2 text-[0.85rem] font-medium text-[#0f1116] hover:bg-gray-50 transition-colors"
            >
              Select
            </button>
          )}
          <Link
            href="/dashboard/tags"
            className="inline-flex items-center gap-2 rounded-xl border border-[#e1e5ee] bg-white px-4 py-2 text-[0.85rem] text-[#0f1116] hover:bg-gray-50 transition-colors"
          >
            Back to Tags
          </Link>
        </div>
      </div>

      {loadError && <ActionError error={loadError} />}

      {isSelectMode && items.length > 0 && (
        <div className="rounded-[20px] border border-[#e2e6ee] bg-white px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-[0.85rem] text-gray-600 cursor-pointer">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleAll}
                className="h-4 w-4 rounded accent-[#0f1116]"
              />
              Select all ({items.length})
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={restoreSelected}
                disabled={selected.size === 0}
                className="flex items-center gap-1.5 rounded-xl border border-[#e1e5ee] px-3 py-2 text-[0.8rem] text-gray-700 hover:bg-gray-50 disabled:opacity-40 transition-colors"
              >
                <MdRestoreFromTrash size={15} /> Restore selected
              </button>
              <button
                type="button"
                onClick={deleteSelected}
                disabled={selected.size === 0}
                className="flex items-center gap-1.5 rounded-xl bg-red-600 px-3 py-2 text-[0.8rem] text-white hover:bg-red-700 disabled:opacity-40 transition-colors"
              >
                <MdDeleteOutline size={15} /> Delete selected
              </button>
            </div>
          </div>
        </div>
      )}

      {items.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <div
              key={item.id}
              className={`flex items-center justify-between rounded-[20px] border bg-white p-4 transition-colors ${selected.has(item.id) ? 'border-[#0f1116]/20 bg-[#f7f8fb]' : 'border-[#eef1f6]'}`}
            >
              <div className="flex items-center gap-3">
                {isSelectMode && (
                  <input
                    type="checkbox"
                    checked={selected.has(item.id)}
                    onChange={() => toggle(item.id)}
                    className="h-4 w-4 rounded accent-[#0f1116]"
                  />
                )}
                <span
                  className="flex h-7 w-7 items-center justify-center rounded-full"
                  style={{ backgroundColor: item.color }}
                >
                  <MdLabel size={14} className="text-[#0f1116]/70" />
                </span>
                <div>
                  <p className="text-[0.88rem] font-medium text-gray-400 line-through">
                    #{item.name}
                  </p>
                  <p className="text-[0.75rem] text-gray-400">Deleted {item.deletedAt}</p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <button
                  type="button"
                  onClick={() => restore(item.id)}
                  className="flex items-center gap-1 rounded-lg bg-[#0f1116] px-2.5 py-1.5 text-[0.75rem] font-medium text-white hover:opacity-90 transition-opacity"
                >
                  <MdRestoreFromTrash size={13} /> Restore
                </button>
                {confirmId === item.id ? (
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => deletePerm(item.id)}
                      className="rounded-lg bg-red-600 px-2.5 py-1.5 text-[0.75rem] text-white hover:bg-red-700"
                    >
                      Confirm
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmId(null)}
                      className="rounded-lg border border-[#e1e5ee] px-2.5 py-1.5 text-[0.75rem] text-gray-500 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmId(item.id)}
                    className="flex items-center gap-1 rounded-lg border border-red-100 px-2.5 py-1.5 text-[0.75rem] text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <MdDeleteOutline size={13} /> Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-3 rounded-[24px] border border-dashed border-[#d8dde6] bg-[#fafbff] py-20 text-center">
          <MdDeleteOutline size={36} className="text-gray-300" />
          <p className="text-[1rem] font-medium text-gray-400">
            {isLoading ? 'Loading trash…' : 'Tag trash is empty'}
          </p>
          <Link href="/dashboard/tags" className="text-[0.85rem] text-[#1e4fd2] hover:underline">
            Back to tags
          </Link>
        </div>
      )}
    </div>
  );
}
